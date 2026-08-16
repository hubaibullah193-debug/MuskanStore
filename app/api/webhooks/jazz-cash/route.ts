/**
 * JazzCash Payment Webhook Handler
 * Receives async payment confirmation from JazzCash
 * Handles both success and failure scenarios
 * CRITICAL: Verifies webhook authenticity and amount before updating order
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { recordPaymentAttempt, logAuditEvent } from "@/lib/supabase/helpers";
import { verifyJazzCashWebhookSignature } from "@/lib/payments/signature";
import {
  recordWebhookProcessing,
  finalizeInventory,
  releaseInventoryReservations,
} from "@/lib/payments/inventory-finalization";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // SECURITY: Verify webhook signature using HMAC (NOT just field presence)
    const password = process.env.JAZZ_CASH_PP_PASSWORD || "";
    if (!password) {
      console.error("JazzCash webhook: JAZZ_CASH_PP_PASSWORD not configured");
      return NextResponse.json(
        { error: "Gateway not configured" },
        { status: 500 }
      );
    }

    const isValidSignature = verifyJazzCashWebhookSignature(password, body);

    if (!isValidSignature) {
      console.error("JazzCash webhook signature verification failed - rejecting forged webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const orderId = body.pp_TxnRefNo;
    const responseCode = body.pp_ResponseCode;
    const transactionId = body.pp_TransactionID;
    const amount = body.pp_Amount ? parseInt(body.pp_Amount) / 100 : 0; // Convert from cents

    if (!orderId || !responseCode) {
      console.error("JazzCash webhook missing required fields");
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
      console.error(`JazzCash webhook: Order ${orderId} not found`);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // SECURITY: Verify amount matches order total (prevent partial payment acceptance)
    if (Math.abs(amount - order.total_amount) > 0.01) {
      console.error(
        `JazzCash webhook: Amount mismatch for order ${orderId}. Expected: ${order.total_amount}, Got: ${amount}`
      );
      await logAuditEvent(
        "payment_amount_mismatch",
        "order",
        orderId,
        {
          gateway: "jazz_cash",
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

    // SECURITY: Record webhook processing to detect and handle duplicates
    const webhookRecord = await recordWebhookProcessing(
      orderId,
      transactionId,
      "jazz_cash",
      body
    );

    // If this is an exact duplicate webhook and was already processed, return success
    if (webhookRecord.isDuplicate && webhookRecord.wasProcessed) {
      console.log(
        `JazzCash webhook: Duplicate webhook for order ${orderId}, already processed`
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Determine if payment was successful
    const paymentSuccessful = responseCode === "000";
    const isCountedFailure = !paymentSuccessful;

    // Record payment attempt
    await recordPaymentAttempt(
      orderId,
      responseCode,
      paymentSuccessful ? undefined : body.pp_ResponseDesc || "Payment declined",
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
        console.error(`JazzCash webhook: Failed to update order ${orderId}`, updateError);
        // Don't fail the webhook response; webhook was valid, order update is separate concern
      }

      // CRITICAL: Finalize inventory reservations after verified payment
      // This converts temporary holds to permanent stock reduction
      try {
        const result = await finalizeInventory(orderId);
        console.log(
          `JazzCash: Finalized ${result.reservationsFinalized} inventory reservations for order ${orderId}`
        );
      } catch (error) {
        console.error(`JazzCash: Failed to finalize inventory for order ${orderId}`, error);
        await logAuditEvent(
          "inventory_finalization_failed",
          "order",
          orderId,
          { gateway: "jazz_cash", error: String(error) }
        );
        // Don't fail webhook - order is already marked as paid
      }

      // Log payment confirmation
      await logAuditEvent(
        "payment_confirmed_webhook",
        "order",
        orderId,
        {
          gateway: "jazz_cash",
          transactionId,
          amount,
          responseCode,
        }
      );

      console.log(`JazzCash payment confirmed for order ${orderId}`);
    } else {
      // Payment failed - release inventory reservations
      try {
        await releaseInventoryReservations(orderId);
        console.log(`JazzCash: Released inventory reservations for failed order ${orderId}`);
      } catch (error) {
        console.error(`JazzCash: Failed to release reservations for order ${orderId}`, error);
      }

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
          gateway: "jazz_cash",
          transactionId,
          responseCode,
          failureReason: body.pp_ResponseDesc,
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
            gateway: "jazz_cash",
          }
        );
        console.warn(`JazzCash: Order ${orderId} reached max payment failures`);
      }

      console.log(`JazzCash payment failed for order ${orderId}: ${body.pp_ResponseDesc}`);
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("JazzCash webhook error:", error);
    // Return 500 so gateway retries later
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
