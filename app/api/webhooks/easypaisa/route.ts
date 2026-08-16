/**
 * Easypaisa Payment Webhook Handler
 * Receives async payment confirmation from Easypaisa
 * Handles both success and failure scenarios
 * CRITICAL: Verifies webhook authenticity and amount before updating order
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { recordPaymentAttempt, logAuditEvent } from "@/lib/supabase/helpers";
import { verifyEasypaisaWebhookSignature } from "@/lib/payments/signature";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SECURITY: Verify webhook signature using HMAC (NOT just field presence)
    const secret = process.env.EASYPAISA_MERCHANT_SECRET || "";
    if (!secret) {
      console.error("Easypaisa webhook: EASYPAISA_MERCHANT_SECRET not configured");
      return NextResponse.json(
        { error: "Gateway not configured" },
        { status: 500 }
      );
    }

    const isValidSignature = verifyEasypaisaWebhookSignature(secret, body);

    if (!isValidSignature) {
      console.error("Easypaisa webhook signature verification failed - rejecting forged webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const orderId = body.transactionID;
    const status = body.status;
    const transactionId = body.transactionID;
    const amount = body.amount ? parseFloat(body.amount) : 0;

    if (!orderId || !status) {
      console.error("Easypaisa webhook missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_status, payment_status, total_amount, payment_reference")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`Easypaisa webhook: Order ${orderId} not found`);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // SECURITY: Verify amount matches order total (prevent partial payment acceptance)
    if (Math.abs(amount - order.total_amount) > 0.01) {
      console.error(
        `Easypaisa webhook: Amount mismatch for order ${orderId}. Expected: ${order.total_amount}, Got: ${amount}`
      );
      await logAuditEvent(
        "payment_amount_mismatch",
        "order",
        orderId,
        {
          gateway: "easypaisa",
          expectedAmount: order.total_amount,
          receivedAmount: amount,
          transactionId,
        }
      );
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // SECURITY: Prevent duplicate webhook processing (idempotency check)
    if (order.payment_status === "paid" && order.payment_reference === transactionId) {
      console.log(`Easypaisa webhook: Duplicate webhook for order ${orderId}, already paid`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Determine if payment was successful
    const paymentSuccessful = status === "success" || status === "completed";
    const isCountedFailure = !paymentSuccessful;

    // Record payment attempt
    await recordPaymentAttempt(
      orderId,
      status,
      paymentSuccessful ? undefined : body.errorDescription || "Payment declined",
      isCountedFailure
    );

    if (paymentSuccessful) {
      // Update order status to confirmed and payment status to paid
      // ONLY after signature AND amount verification passed
      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          order_status: "confirmed",
          payment_status: "paid",
          payment_reference: transactionId,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (updateError) {
        console.error(`Easypaisa webhook: Failed to update order ${orderId}`, updateError);
        // Don't fail the webhook response; webhook was valid, order update is separate concern
      }

      // Log payment confirmation
      await logAuditEvent(
        "payment_confirmed_webhook",
        "order",
        orderId,
        {
          gateway: "easypaisa",
          transactionId,
          amount,
          status,
        }
      );

      console.log(`Easypaisa payment confirmed for order ${orderId}`);
    } else {
      // Payment failed
      const { data: attempts } = await supabase
        .from("payment_attempts")
        .select("attempt_number, is_counted_failure")
        .eq("order_id", orderId)
        .order("attempted_at", { ascending: false })
        .limit(1);

      const failureCount = attempts?.filter((a) => a.is_counted_failure).length || 0;

      // Log payment failure
      await logAuditEvent(
        "payment_failed_webhook",
        "order",
        orderId,
        {
          gateway: "easypaisa",
          transactionId,
          status,
          failureReason: body.errorDescription,
          failureCount: failureCount,
        }
      );

      // If 3rd failure, alert admin
      if (failureCount >= 3) {
        await logAuditEvent(
          "payment_max_failures_reached",
          "order",
          orderId,
          {
            failureCount: 3,
            gateway: "easypaisa",
          }
        );
        console.warn(`Easypaisa: Order ${orderId} reached max payment failures`);
      }

      console.log(`Easypaisa payment failed for order ${orderId}: ${body.errorDescription}`);
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Easypaisa webhook error:", error);
    // Return 500 so gateway retries later
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
