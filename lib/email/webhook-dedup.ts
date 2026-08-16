/**
 * Email Deduplication for Webhook Callbacks
 * Prevents duplicate emails from webhook retries using SHA256 payload hashing
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
 * Check if email was already sent for this webhook
 * Prevents duplicate emails from duplicate webhook callbacks
 */
export async function shouldSendWebhookEmail(record: WebhookEmailRecord): Promise<boolean> {
  try {
    // Create deterministic hash of webhook payload
    const webhookHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(record.webhookPayload))
      .digest("hex");

    // Check if this exact webhook payload already triggered an email
    const { data: existing } = await supabaseAdmin
      .from("webhook_email_tracking")
      .select("id")
      .eq("order_id", record.orderId)
      .eq("transaction_id", record.transactionId)
      .eq("payment_gateway", record.paymentGateway)
      .eq("email_type", record.emailType)
      .eq("webhook_hash", webhookHash)
      .single();

    if (existing) {
      // Email already sent for this exact webhook
      return false;
    }

    // Record that we're sending email for this webhook
    await supabaseAdmin
      .from("webhook_email_tracking")
      .insert({
        order_id: record.orderId,
        transaction_id: record.transactionId,
        payment_gateway: record.paymentGateway,
        email_type: record.emailType,
        webhook_hash: webhookHash,
        sent_at: new Date().toISOString(),
      });

    return true;
  } catch (error) {
    console.error("Error checking webhook email dedup:", error);
    // On error, allow sending (fail open) - better to send duplicate than none
    return true;
  }
}
