/**
 * JazzCash Payment Webhook Handler
 * Receives async payment confirmation from JazzCash
 * Handles both success and failure scenarios
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { recordPaymentAttempt, logAuditEvent } from "@/lib/supabase/helpers";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature (simplified; production would use proper HMAC verification)
    const isValidSignature = verifyJazzCashSignature(body);

    if (!isValidSignature) {
      console.error("JazzCash webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
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
      .select("id, order_status, payment_status, total_amount")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`JazzCash webhook: Order ${orderId} not found`);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
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
      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          order_status: "confirmed",
          payment_status: "paid",
        })
        .eq("id", orderId)
        .select()
        .single();

      if (updateError) {
        console.error(`JazzCash webhook: Failed to update order ${orderId}`, updateError);
        // Don't fail the webhook response; webhook was valid, order update is separate concern
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

// ===================================================================
// VERIFY JAZZCASH WEBHOOK SIGNATURE
// ===================================================================

function verifyJazzCashSignature(webhook: Record<string, any>): boolean {
  try {
    // In production, verify HMAC signature using JazzCash public key
    // For now, verify required fields exist
    const requiredFields = [
      "pp_TxnRefNo",
      "pp_ResponseCode",
      "pp_TransactionID",
      "pp_Amount",
    ];

    for (const field of requiredFields) {
      if (!webhook[field]) {
        console.error(`JazzCash webhook missing field: ${field}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("JazzCash signature verification error:", error);
    return false;
  }
}
