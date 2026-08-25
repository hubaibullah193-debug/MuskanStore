// lib/email/delivery.ts
// Reliable email send + delivery tracking + retry bookkeeping.
//
// This is the SINGLE production email path (P1 unification). All domain email
// functions (order confirmation, payment status, refund, shipment, low-stock)
// route through `logAndSendEmail`, which:
//   1. Records the attempt in `email_logs` (status: pending) with an optional
//      idempotency key so duplicate business events never send twice.
//   2. Sends via the configured provider (`lib/email/service.ts`).
//   3. On success marks the row `sent`; on failure marks it `failed` and
//      schedules a retry (exponential backoff, max `max_retries` attempts).
//
// A separate cron worker (`app/api/cron/email-retry`) re-invokes
// `logAndSendEmail` for `failed` rows whose backoff window has elapsed.

import { supabaseAdmin } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/service";

export interface LoggedEmailOptions {
  to: string;
  subject: string;
  html: string;
  emailType: string;
  referenceId?: string | null;
  referenceType?: string | null;
  /** Stable key; identical key => at most one (successful or in-flight) send. */
  idempotencyKey?: string | null;
  /** Override default 3 attempts (spec: up to 3 over 24h). */
  maxRetries?: number;
}

export interface LoggedEmailResult {
  success: boolean;
  /** True when an identical in-flight/sent email already existed (no resend). */
  skipped?: boolean;
  error?: string;
}

// Exponential backoff: 5m, 10m, 20m... capped at 12h. Well within 24h for 3 attempts.
function backoffDelayMs(retryCount: number): number {
  const minutes = Math.min(5 * Math.pow(2, Math.max(0, retryCount - 1)), 720);
  return minutes * 60 * 1000;
}

/**
 * Send an email with delivery tracking + idempotency + retry scheduling.
 * Never throws — failures are recorded in `email_logs` for the retry worker.
 */
export async function logAndSendEmail(
  opts: LoggedEmailOptions
): Promise<LoggedEmailResult> {
  const maxRetries = opts.maxRetries ?? 3;
  const idemKey = opts.idempotencyKey ?? null;

  let logId: string | null = null;

  // --- Idempotency / reuse existing row -------------------------------
  if (idemKey) {
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("email_logs")
      .select("id, status")
      .eq("idempotency_key", idemKey)
      .maybeSingle();

    if (selErr) {
      console.error("[email] idempotency lookup failed:", selErr.message);
    } else if (existing) {
      if (existing.status === "sent" || existing.status === "pending") {
        return { success: true, skipped: true };
      }
      // A previously failed row: reuse it so retry_count stays coherent.
      logId = existing.id;
    }
  }

  // --- Create the tracking row (unless we're reusing a failed one) -----
  if (!logId) {
    const insertRow = {
      recipient_email: opts.to,
      subject: opts.subject,
      email_type: opts.emailType,
      status: "pending",
      reference_id: opts.referenceId || null,
      reference_type: opts.referenceType || null,
      html_body: opts.html,
      max_retries: maxRetries,
      idempotency_key: idemKey,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("email_logs")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr) {
      if ((insErr as any).code === "23505") {
        // Concurrent duplicate insert (race on idempotency key) => skip.
        return { success: true, skipped: true };
      }
      console.error("[email] failed to record email_logs:", insErr.message);
      // Without a tracking row we cannot schedule a retry; attempt a direct
      // send so the email is not silently dropped.
      return sendDirect(opts);
    }
    logId = inserted?.id ?? null;
  }

  // --- Send ------------------------------------------------------------
  if (!logId) {
    return sendDirect(opts);
  }

  const result = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  const nowIso = new Date().toISOString();

  if (result.success) {
    await supabaseAdmin
      .from("email_logs")
      .update({
        status: "sent",
        message_id: result.messageId ?? null,
        sent_at: nowIso,
        error_message: null,
        next_retry_at: null,
      })
      .eq("id", logId);
    return { success: true };
  }

  // --- Failure: schedule retry (or alert on final failure) ------------
  const { data: cur } = await supabaseAdmin
    .from("email_logs")
    .select("retry_count")
    .eq("id", logId)
    .maybeSingle();

  const retryCount = (cur?.retry_count ?? 0) + 1;
  const isFinal = retryCount >= maxRetries;

  await supabaseAdmin
    .from("email_logs")
    .update({
      status: "failed",
      error_message: result.error ?? "send failed",
      retry_count: retryCount,
      next_retry_at: isFinal
        ? null
        : new Date(Date.now() + backoffDelayMs(retryCount)).toISOString(),
    })
    .eq("id", logId);

  if (isFinal) {
    await alertAdminEmailFailure(logId, opts, result.error);
  }

  return { success: false, error: result.error };
}

/** Fallback path used only when the tracking row could not be created. */
async function sendDirect(
  opts: LoggedEmailOptions
): Promise<LoggedEmailResult> {
  const result = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

/**
 * Retry all failed/pending emails whose backoff window has elapsed.
 * Invoked by the email-retry cron. Reuses `logAndSendEmail` so idempotency
 * and retry_count accounting stay correct.
 */
export async function retryFailedEmails(): Promise<{
  processed: number;
  retried: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let retried = 0;

  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("email_logs")
    .select(
      "id, recipient_email, subject, html_body, email_type, reference_id, reference_type, idempotency_key, max_retries, retry_count, next_retry_at, status"
    )
    .in("status", ["failed", "pending"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    errors.push(error.message);
    return { processed, retried, errors };
  }

  for (const row of due || []) {
    // Final-failure rows have next_retry_at = null; never retry them again.
    if (row.status === "failed" && !row.next_retry_at) continue;
    // Safety guard: do not exceed max attempts.
    if ((row.retry_count ?? 0) >= (row.max_retries ?? 3)) continue;
    processed++;
    try {
      const res = await logAndSendEmail({
        to: row.recipient_email,
        subject: row.subject,
        html: row.html_body || "",
        emailType: row.email_type,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        idempotencyKey: row.idempotency_key,
        maxRetries: row.max_retries,
      });
      if (!res.skipped) retried++;
    } catch (e) {
      errors.push(
        `row ${row.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return { processed, retried, errors };
}

/**
 * Record a hard bounce / complaint for a recipient and mark the matching
 * email_logs row as `bounced`. After `threshold` bounces the recipient is
 * flagged invalid (spec: 3 bounces => invalid). Returns whether the
 * recipient was newly marked invalid.
 */
export async function recordBounce(
  recipientEmail: string,
  messageId: string | null,
  threshold = 3
): Promise<{ markedInvalid: boolean }> {
  // Mark the specific delivery as bounced (match by provider message id).
  if (messageId) {
    await supabaseAdmin
      .from("email_logs")
      .update({ status: "bounced" })
      .eq("message_id", messageId)
      .in("status", ["sent", "pending", "failed"]);
  } else {
    await supabaseAdmin
      .from("email_logs")
      .update({ status: "bounced" })
      .eq("recipient_email", recipientEmail)
      .in("status", ["sent", "pending", "failed"]);
  }

  const { data: existing } = await supabaseAdmin
    .from("recipient_bounce_tracking")
    .select("bounce_count, marked_invalid")
    .eq("recipient_email", recipientEmail)
    .maybeSingle();

  const bounceCount = (existing?.bounce_count ?? 0) + 1;
  const markedInvalid = bounceCount >= threshold && !existing?.marked_invalid;

  await supabaseAdmin.from("recipient_bounce_tracking").upsert(
    {
      recipient_email: recipientEmail,
      bounce_count: bounceCount,
      last_bounce_at: new Date().toISOString(),
      marked_invalid: markedInvalid || !!existing?.marked_invalid,
    },
    { onConflict: "recipient_email" }
  );

  if (markedInvalid) {
    await supabaseAdmin.from("admin_audit_logs").insert({
      action: "email_recipient_marked_invalid",
      entity_type: "recipient_bounce_tracking",
      entity_id: null,
      changes: { recipient_email: recipientEmail, bounce_count: bounceCount },
    });
  }

  return { markedInvalid };
}

/** Alert admins when an email exhausts all retries (spec: admin is alerted). */
async function alertAdminEmailFailure(
  logId: string,
  opts: LoggedEmailOptions,
  error?: string
) {
  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      action: "email_delivery_failed",
      entity_type: "email_logs",
      entity_id: logId,
      changes: {
        recipient_email: opts.to,
        subject: opts.subject,
        email_type: opts.emailType,
        reference_id: opts.referenceId ?? null,
        error: error ?? "unknown",
      },
    });
  } catch (e) {
    console.error("[email] failed to alert admin of email failure:", e);
  }
}
