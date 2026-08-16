"use server";

/**
 * Payment Server Actions
 * Payment initiation, verification, and status updates
 * Handles JazzCash and Easypaisa integrations
 */

import { supabase } from "@/lib/supabase/client";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";
import { recordPaymentAttempt, logAuditEvent } from "@/lib/supabase/helpers";
import { generateJazzCashUrl, generateEasypaisaUrl } from "@/lib/payments/url-generators";

// ===================================================================
// INITIATE PAYMENT (REDIRECT TO GATEWAY)
// ===================================================================

export async function initiatePayment(
  orderId: string,
  paymentMethod: "jazz_cash" | "easypaisa",
  amount: number,
  customerEmail: string
) {
  try {
    if (!orderId || !paymentMethod || amount <= 0) {
      throw new AppError("INVALID_PARAMS", "Invalid order or payment details", 400);
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("order_number, total_amount, payment_method, order_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify order is in pending_payment status
    if (order.order_status !== "pending_payment") {
      throw new AppError(
        "INVALID_STATUS",
        `Order cannot be paid in ${order.order_status} status`,
        400
      );
    }

    // Verify payment method matches order
    if (order.payment_method !== paymentMethod) {
      throw new AppError(
        "PAYMENT_METHOD_MISMATCH",
        "Payment method does not match order",
        400
      );
    }

    // Verify amount matches order total
    if (Math.abs(amount - order.total_amount) > 0.01) {
      throw new AppError("AMOUNT_MISMATCH", "Amount does not match order total", 400);
    }

    // Generate payment request based on gateway
    let paymentUrl: string = "";

    if (paymentMethod === "jazz_cash") {
      paymentUrl = generateJazzCashUrl(orderId, amount, customerEmail);
    } else if (paymentMethod === "easypaisa") {
      paymentUrl = generateEasypaisaUrl(orderId, amount, customerEmail);
    } else {
      throw new AppError("INVALID_METHOD", "Unsupported payment method", 400);
    }

    // Log initiation
    await logAuditEvent(
      "payment_initiated",
      "order",
      orderId,
      {
        paymentMethod,
        amount,
        redirectUrl: paymentUrl,
      }
    );

    return {
      orderId,
      paymentUrl,
      method: paymentMethod,
      amount,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("PAYMENT_INITIATION_ERROR", getErrorMessage(error), 500);
  }
}


// ===================================================================
// VERIFY PAYMENT (AFTER REDIRECT FROM GATEWAY)
// ===================================================================

export async function verifyPayment(
  orderId: string,
  paymentMethod: "jazz_cash" | "easypaisa",
  gatewayResponse: Record<string, any>
) {
  try {
    if (!orderId || !paymentMethod || !gatewayResponse) {
      throw new AppError("INVALID_PARAMS", "Invalid verification parameters", 400);
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_status, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify signature based on gateway
    let isValid = false;
    let paymentSuccessful = false;

    if (paymentMethod === "jazz_cash") {
      isValid = verifyJazzCashSignature(gatewayResponse);
      paymentSuccessful = gatewayResponse.pp_ResponseCode === "000";
    } else if (paymentMethod === "easypaisa") {
      isValid = verifyEasypaisaSignature(gatewayResponse);
      paymentSuccessful = gatewayResponse.status === "success";
    }

    if (!isValid) {
      throw new AppError("SIGNATURE_INVALID", "Payment signature verification failed", 400);
    }

    // Record payment attempt
    const isCountedFailure = !paymentSuccessful;

    await recordPaymentAttempt(
      orderId,
      gatewayResponse.pp_ResponseCode || gatewayResponse.code,
      paymentSuccessful ? undefined : gatewayResponse.errorDescription || "Payment declined",
      isCountedFailure
    );

    if (!paymentSuccessful) {
      throw new AppError("PAYMENT_DECLINED", "Payment was declined by gateway", 400);
    }

    // Update order status and payment status
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
      throw new AppError("ORDER_UPDATE_FAILED", updateError.message, 500);
    }

    // Log payment success
    await logAuditEvent(
      "payment_confirmed",
      "order",
      orderId,
      {
        paymentMethod,
        gatewayResponse: gatewayResponse.pp_ResponseCode || gatewayResponse.code,
      }
    );

    return {
      orderId,
      status: "confirmed",
      message: "Payment successful",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("PAYMENT_VERIFICATION_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// VERIFY JAZZCASH SIGNATURE
// ===================================================================

function verifyJazzCashSignature(response: Record<string, any>): boolean {
  try {
    // SECURITY: Import and use actual HMAC signature verification
    const { verifyJazzCashWebhookSignature } = require("@/lib/payments/signature");
    const password = process.env.JAZZ_CASH_PP_PASSWORD || "";

    if (!password) {
      console.error("JazzCash signature verification: JAZZ_CASH_PP_PASSWORD not configured");
      return false;
    }

    // Verify using actual HMAC, not just field presence
    return verifyJazzCashWebhookSignature(password, response);
  } catch (error) {
    console.error("JazzCash signature verification error:", error);
    return false;
  }
}

// ===================================================================
// VERIFY EASYPAISA SIGNATURE
// ===================================================================

function verifyEasypaisaSignature(response: Record<string, any>): boolean {
  try {
    // SECURITY: Import and use actual HMAC signature verification
    const { verifyEasypaisaWebhookSignature } = require("@/lib/payments/signature");
    const secret = process.env.EASYPAISA_MERCHANT_SECRET || "";

    if (!secret) {
      console.error("Easypaisa signature verification: EASYPAISA_MERCHANT_SECRET not configured");
      return false;
    }

    // Verify using actual HMAC, not just field presence
    return verifyEasypaisaWebhookSignature(secret, response);
  } catch (error) {
    console.error("Easypaisa signature verification error:", error);
    return false;
  }
}

// ===================================================================
// GET PAYMENT RETRY STATUS
// ===================================================================

export async function getPaymentRetryStatus(orderId: string) {
  try {
    if (!orderId) {
      throw new AppError("INVALID_ID", "Order ID required", 400);
    }

    // Get payment attempts for this order
    const { data: attempts, error } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("order_id", orderId)
      .order("attempted_at", { ascending: false });

    if (error) {
      throw new AppError("FETCH_ATTEMPTS_FAILED", error.message, 500);
    }

    // Count failures in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentFailures = (attempts || []).filter(
      (a: any) =>
        a.is_counted_failure &&
        new Date(a.attempted_at).toISOString() > sevenDaysAgo
    );

    const canRetry = recentFailures.length < 3;

    return {
      orderId,
      attemptCount: attempts?.length || 0,
      countedFailures: recentFailures.length,
      canRetry,
      maxAttemptsReached: recentFailures.length >= 3,
      attempts: attempts || [],
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_RETRY_STATUS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// RETRY PAYMENT
// ===================================================================

export async function retryPayment(
  orderId: string,
  paymentMethod: "jazz_cash" | "easypaisa",
  customerEmail: string
) {
  try {
    if (!orderId || !paymentMethod) {
      throw new AppError("INVALID_PARAMS", "Order ID and payment method required", 400);
    }

    // Check retry eligibility
    const retryStatus = await getPaymentRetryStatus(orderId);

    if (!retryStatus.canRetry) {
      throw new AppError(
        "MAX_RETRIES_EXCEEDED",
        "Maximum payment retry attempts (3) exceeded",
        400
      );
    }

    // Get order amount
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("total_amount, payment_method")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify payment method matches
    if (order.payment_method !== paymentMethod) {
      throw new AppError("PAYMENT_METHOD_MISMATCH", "Payment method does not match order", 400);
    }

    // Initiate new payment
    return initiatePayment(orderId, paymentMethod, order.total_amount, customerEmail);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("RETRY_PAYMENT_ERROR", getErrorMessage(error), 500);
  }
}
