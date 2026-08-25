/**
 * Email Deduplication for Webhook Callbacks
 * Prevents duplicate emails from webhook retries using a UNIQUE constraint on
 * (order_id, transaction_id, payment_gateway, email_type, webhook_hash).
 *
 * P1 fix: the check is now ATOMIC (single INSERT ... ON CONFLICT) and FAILS
 * CLOSED. A genuine duplicate (unique violation) returns false so no duplicate
 * email is sent. On any other DB error we also suppress the send (fail closed)
 * rather than risk a duplicate; the gateway will retry the webhook and the
 * attempt will succeed once the DB is healthy.
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import crypto from "crypto";

interface WebhookEmailRecord {
  orderId: string;
  transactionId: string;
  paymentGateway: "jazz_cash" | "easypaisa";
  emailType: "payment_status" | "order_confirmation";
  webhookPayload: Record<string, any>;
}

/**
 * Returns true if the caller should send the email (this is the first time we
 * see this exact webhook), false if it is a duplicate or we cannot safely send.
 */
export async function shouldSendWebhookEmail(
  record: WebhookEmailRecord
): Promise<boolean> {
  const webhookHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(record.webhookPayload))
    .digest("hex");

  try {
    const { count, error } = await supabaseAdmin
      .from("webhook_email_tracking")
      .insert(
        {
          order_id: record.orderId,
          transaction_id: record.transactionId,
          payment_gateway: record.paymentGateway,
          email_type: record.emailType,
          webhook_hash: webhookHash,
          sent_at: new Date().toISOString(),
        },
        { count: "exact" }
      );

    if (error) {
      if ((error as any).code === "23505") {
        // Unique violation => this webhook already triggered an email.
        return false;
      }
      // Any other error: fail closed (suppress) to avoid duplicates.
      console.error("webhook email dedup error:", error.message);
      return false;
    }

    // count === 1 means a new row was inserted; 0 would mean a conflict was
    // swallowed (defensive) — treat as duplicate.
    return (count ?? 0) > 0;
  } catch (error) {
    console.error("Error checking webhook email dedup:", error);
    return false;
  }
}
