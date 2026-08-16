"use server";

/**
 * Admin Order Management Server Actions
 * View orders, update status, mark COD paid, process refunds
 * All operations logged to audit trail
 */

import { supabase } from "@/lib/supabase/client";
import { OrderStatusUpdateSchema } from "@/lib/validation/schemas";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";
import { logAuditEvent } from "@/lib/supabase/helpers";
import { sendRefundEmail } from "@/server/actions/email";

// ===================================================================
// GET ORDERS (PAGINATED, WITH FILTERS)
// ===================================================================

export async function getAdminOrders(
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  try {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError("INVALID_PARAMS", "Invalid page or limit", 400);
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) {
      query = query.eq("order_status", filters.status);
    }

    if (filters?.paymentMethod) {
      query = query.eq("payment_method", filters.paymentMethod);
    }

    if (filters?.paymentStatus) {
      query = query.eq("payment_status", filters.paymentStatus);
    }

    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError("FETCH_ORDERS_FAILED", error.message, 500);
    }

    return {
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_ORDERS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET ORDER DETAIL (ADMIN VIEW)
// ===================================================================

export async function getAdminOrder(orderId: string) {
  try {
    if (!orderId) {
      throw new AppError("INVALID_ID", "Order ID required", 400);
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        payment_attempts (*)
      `
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    return order;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_ORDER_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// MARK COD ORDER AS PAID
// ===================================================================

export async function markCODPaid(adminId: string, orderId: string, notes?: string) {
  try {
    if (!orderId || !adminId) {
      throw new AppError("INVALID_PARAMS", "Order ID and admin ID required", 400);
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("payment_method, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify it's a COD order
    if (order.payment_method !== "cod") {
      throw new AppError(
        "INVALID_METHOD",
        "Only COD orders can be marked paid manually",
        400
      );
    }

    // Update payment status
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "cod_payment_received",
      "order",
      orderId,
      {
        paymentMethod: "cod",
        notes,
      },
      adminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("MARK_PAID_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// APPROVE REFUND
// ===================================================================

export async function approveRefund(
  adminId: string,
  orderId: string,
  refundAmount: number,
  notes?: string
) {
  try {
    if (!orderId || !adminId || refundAmount <= 0) {
      throw new AppError("INVALID_PARAMS", "Invalid parameters", 400);
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("user_id, guest_email, order_status, payment_status, total_amount, items, status_history, refund_reason, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify order is in refund_requested status
    if (order.order_status !== "refund_requested") {
      throw new AppError(
        "INVALID_STATUS",
        "Only refund_requested orders can be approved",
        400
      );
    }

    // Verify refund amount doesn't exceed order total
    if (refundAmount > order.total_amount) {
      throw new AppError(
        "INVALID_AMOUNT",
        `Refund amount cannot exceed order total (${order.total_amount})`,
        400
      );
    }

    // Append to status history
    const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
    statusHistory.push({
      status: "refunded",
      changedAt: new Date().toISOString(),
      changedBy: adminId,
      notes,
    });

    // Update order status to refunded
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        order_status: "refunded",
        payment_status: "paid", // COD was paid or prepaid already confirmed
        refund_amount: refundAmount,
        status_history: statusHistory,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("REFUND_APPROVAL_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "refund_approved",
      "order",
      orderId,
      {
        refundAmount,
        notes,
      },
      adminId
    );

    // Send refund approval email to customer
    let customerEmail = updated.guest_email;
    if (updated.user_id && !customerEmail) {
      // Fetch user email from auth.users if not already retrieved
      const { data } = await supabase.auth.admin.getUserById(updated.user_id);
      customerEmail = data?.user?.email;
    }

    if (customerEmail) {
      await sendRefundEmail({
        orderNumber: updated.order_number,
        customerEmail,
        refundAmount,
        reason: updated.refund_reason,
        status: 'approved',
      }).catch((error) => {
        console.error("Failed to send refund approval email:", error);
        // Don't throw - refund approval succeeded even if email fails
      });
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("APPROVE_REFUND_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET PENDING REFUND REQUESTS
// ===================================================================

export async function getPendingRefunds(limit: number = 50) {
  try {
    if (limit < 1 || limit > 500) {
      throw new AppError("INVALID_LIMIT", "Limit must be between 1 and 500", 400);
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, user_id, guest_email, refund_reason, total_amount, created_at")
      .eq("order_status", "refund_requested")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new AppError("FETCH_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_REFUNDS_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET FAILED PAYMENTS
// ===================================================================

export async function getFailedPayments(limit: number = 50) {
  try {
    if (limit < 1 || limit > 500) {
      throw new AppError("INVALID_LIMIT", "Limit must be between 1 and 500", 400);
    }

    // Get orders with failed payment status
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        user_id,
        guest_email,
        total_amount,
        payment_method,
        created_at,
        payment_attempts (attempt_number, is_counted_failure, error_reason, attempted_at)
      `
      )
      .eq("payment_status", "failed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError("FETCH_FAILED", error.message, 500);
    }

    return (orders || []).map((order: any) => ({
      ...order,
      failedAttemptCount: order.payment_attempts.filter((a: any) => a.is_counted_failure).length,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_FAILED_PAYMENTS_ERROR", getErrorMessage(error), 500);
  }
}
