/**
 * Easypaisa Payment Webhook Handler
 * Receives async payment confirmation from Easypaisa
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
    const isValidSignature = verifyEasypaisaSignature(body);

    if (!isValidSignature) {
      console.error("Easypaisa webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
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
      .select("id, order_status, payment_status, total_amount")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error(`Easypaisa webhook: Order ${orderId} not found`);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
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

// ===================================================================
// VERIFY EASYPAISA WEBHOOK SIGNATURE
// ===================================================================

function verifyEasypaisaSignature(webhook: Record<string, any>): boolean {
  try {
    // In production, verify HMAC signature using Easypaisa public key
    // For now, verify required fields exist
    const requiredFields = ["transactionID", "status", "amount"];

    for (const field of requiredFields) {
      if (!webhook[field]) {
        console.error(`Easypaisa webhook missing field: ${field}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Easypaisa signature verification error:", error);
    return false;
  }
}
