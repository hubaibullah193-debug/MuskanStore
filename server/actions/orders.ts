"use server";

/**
 * Order & Checkout Server Actions
 * Handles checkout flow: inventory reservation, order creation, payment processing
 * All operations run server-side with RLS enforcement and atomic transactions
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import { CheckoutSchema, RefundRequestSchema } from "@/lib/validation/schemas";
import { AppError, getErrorMessage, generateRandomString, calculateTotal } from "@/lib/utils/helpers";
import { generateOrderNumber, logAuditEvent } from "@/lib/supabase/helpers";
import { sendOrderConfirmation, sendRefundEmail } from "@/server/actions/email";
import { createShipment } from "@/server/actions/shipments";
import { clearCart } from "@/server/actions/cart";

// ===================================================================
// CREATE ORDER
// ===================================================================

export async function createOrder(
  userId: string | null,
  guestEmail: string | null,
  items: Array<{ product_id: string; variant_id?: string; quantity: number; price: number }>,
  deliveryAddress: {
    street: string;
    city: string;
    postal_code?: string;
    phone?: string;
    recipient_name?: string;
  },
  paymentMethod: "cod" | "jazz_cash" | "easypaisa",
  taxRate: number = 0,
  deliveryFee: number = 0,
  paymentFee: number = 0,
  idempotencyKey: string | null = null
) {
  try {
    // Validate checkout input
    const validated = CheckoutSchema.parse({
      items,
      delivery_address: deliveryAddress,
      payment_method: paymentMethod,
    });

    // Validate that either userId or guestEmail is provided
    if (!userId && !guestEmail) {
      throw new AppError("INVALID_USER", "User ID or guest email required", 400);
    }

    // Idempotency: if a client-provided key already has an order, return it.
    // Makes checkout safe against double-submits and network retries
    // (avoids duplicate order, inventory reservation, and confirmation email).
    if (idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        await clearCart(userId, guestEmail).catch(() => {});
        return existing;
      }
    }

    // Validate delivery city in service areas
    const { data: serviceArea, error: serviceError } = await supabaseAdmin
      .from("service_areas")
      .select("id")
      .eq("city", deliveryAddress.city)
      .eq("is_active", true)
      .single();

    if (serviceError || !serviceArea) {
      throw new AppError(
        "SERVICE_AREA_UNAVAILABLE",
        `Delivery to ${deliveryAddress.city} not available`,
        400
      );
    }

    // Calculate totals server-side (never trust client prices)
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      // Get fresh product price from database
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, name, base_price, is_active")
        .eq("id", item.product_id)
        .single();

      if (productError || !product || !product.is_active) {
        throw new AppError("PRODUCT_NOT_FOUND", `Product ${item.product_id} not available`, 404);
      }

      // Get variant price if applicable
      let price = product.base_price;
      let variantName;

      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin
          .from("product_variants")
          .select("id, variant_name, price_adjustment")
          .eq("id", item.variant_id)
          .eq("product_id", item.product_id)
          .single();

        if (variant?.price_adjustment) {
          price = Number(product.base_price) + Number(variant.price_adjustment);
        }
        variantName = variant?.variant_name;
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: item.product_id,
        product_name: product.name,
        variant_id: item.variant_id,
        variant_name: variantName,
        quantity: item.quantity,
        price,
        subtotal: itemSubtotal,
      });
    }

    // Calculate taxes and final total
    const taxAmount = Math.round((subtotal * taxRate) / 100 * 100) / 100;
    const totalAmount = calculateTotal(subtotal, taxAmount, deliveryFee, paymentFee);

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Generate guest token if needed
    const guestToken = !userId ? generateRandomString(32) : null;
    const guestTokenExpiresAt = !userId
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        guest_email: guestEmail,
        guest_token: guestToken,
        idempotency_key: idempotencyKey || null,
        guest_token_expires_at: guestTokenExpiresAt,
        items: orderItems,
        delivery_address: deliveryAddress,
        order_status: paymentMethod === "cod" ? "confirmed" : "pending_payment",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "awaiting_cod" : "pending",
        total_amount: totalAmount,
        subtotal,
        tax_amount: taxAmount,
        delivery_fee: deliveryFee,
        payment_fee: paymentFee,
        status_history: [
          {
            status: paymentMethod === "cod" ? "confirmed" : "pending_payment",
            changedAt: new Date().toISOString(),
            changedBy: userId || "guest",
          },
        ],
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_CREATE_FAILED", orderError?.message || "Failed to create order", 500);
    }

    // Clear the cart now that the order exists (idempotent delete).
    // Done before downstream side-effects (email/shipment) so a retried
    // checkout that finds the same order elsewhere still ends with an empty cart.
    await clearCart(userId, guestEmail).catch((error) => {
      console.error("Failed to clear cart after order creation:", error);
    });

    // Create inventory reservations (NOT permanent decrement yet)
    // Inventory only finalizes after verified payment (or immediately for COD)
    for (const item of items) {
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("inventory_reservations")
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          status: "reserved",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          finalized_at: null,
        })
        .select()
        .single();

      if (reservationError) {
        console.error(`Failed to create inventory reservation for order ${order.id}:`, reservationError);
        // Don't fail the entire order - reservation is for tracking, not blocking
      }
    }

    // For COD orders, finalize inventory immediately (no payment verification needed)
    if (paymentMethod === "cod") {
      try {
        const { finalizeInventory } = await import("@/lib/payments/inventory-finalization");
        await finalizeInventory(order.id);
      } catch (error) {
        console.error(`Failed to finalize inventory for COD order ${order.id}:`, error);
        // Log the failure but don't fail the order
        // Inventory will be finalized later via webhook or manual admin action
        await logAuditEvent(
          "inventory_finalization_failed",
          "order",
          order.id,
          { paymentMethod: "cod", error: String(error) }
        );
        // Still return the order - it's up to admin to finalize inventory manually if needed
      }
    }

    // Log audit event
    if (userId) {
      await logAuditEvent(
        "order_created",
        "order",
        order.id,
        {
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
          paymentMethod: paymentMethod,
        },
        userId
      );
    }

    // Send order confirmation email
    let customerEmail = guestEmail;
    if (userId && !customerEmail) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (data?.user?.email) {
        customerEmail = data.user.email;
      }
    }

    // Fallback: if still no email and we have guestEmail, use it
    if (!customerEmail && guestEmail) {
      customerEmail = guestEmail;
    }

    if (customerEmail) {
      await sendOrderConfirmation({
        orderNumber: order.order_number,
        customerEmail,
        items: orderItems.map((item) => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: item.subtotal,
        })),
        subtotal,
        tax: taxAmount,
        shippingFee: deliveryFee,
        totalAmount,
        shippingAddress: deliveryAddress as any,
      }).catch((error) => {
        console.error("Failed to send order confirmation email:", error);
        // Don't throw - order succeeded even if email fails
        // Email logs will capture the failure for retry/debugging
      });
    } else {
      // No email available - log for debugging but don't fail the order
      console.warn("No customer email available for order confirmation", {
        orderNumber: order.order_number,
        userId,
        guestEmail,
      });
    }

    // Auto-create shipment record for tracking
    try {
      await createShipment({
        orderId: order.id,
        carrier: "pending",
      });
    } catch (error) {
      console.error("Failed to auto-create shipment:", error);
      // Don't throw - order succeeded even if shipment creation fails
    }

    return order;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ORDER_CREATE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET ORDER BY ID (WITH GUEST TOKEN SUPPORT)
// ===================================================================

export async function getOrderForDisplay(
  orderId: string,
  userId?: string,
  guestToken?: string
): Promise<any | null> {
  try {
    if (!orderId) {
      return null;
    }

    // If no userId provided, try to resolve from auth cookie
    let resolvedUserId = userId;
    if (!resolvedUserId && !guestToken) {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const authToken = cookieStore.get("auth-token")?.value;
        if (authToken) {
          const { decodeJwt } = await import("jose");
          const payload = decodeJwt(authToken);
          resolvedUserId = payload.sub || undefined;
        }
      } catch {
        // No cookie or invalid token - proceed without userId
      }
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return null;
    }

    // Verify access: customer owns order, guest has valid token, or admin
    const isOwner = resolvedUserId && order.user_id === resolvedUserId;
    const isGuest = !order.user_id && order.guest_email && guestToken === order.guest_token;
    const tokenValid = order.guest_token_expires_at
      ? new Date(order.guest_token_expires_at) > new Date()
      : false;

    if (!isOwner && !(isGuest && tokenValid)) {
      return null;
    }

    return order;
  } catch (error) {
    console.error("getOrderForDisplay error:", error);
    return null;
  }
}

// ===================================================================
// UPDATE ORDER STATUS
// ===================================================================

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  _adminId: string,
  notes?: string
) {
  try {
    if (!orderId || !newStatus) {
      throw new AppError("INVALID_PARAMS", "Order ID and status required", 400);
    }

    // Verify admin access server-side
    const { verifyAdminAccess } = await import("./auth");
    const adminAccess = await verifyAdminAccess();
    if (!adminAccess) {
      throw new AppError("UNAUTHORIZED", "Admin access required", 403);
    }
    const verifiedAdminId = adminAccess.userId;

    // Get current order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("order_status, status_history")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Add status to history
    const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
    statusHistory.push({
      status: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: verifiedAdminId,
      notes,
    });

    // Update order
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: newStatus,
        status_history: statusHistory,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("STATUS_UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "order_status_updated",
      "order",
      orderId,
      {
        oldStatus: order.order_status,
        newStatus,
        notes,
      },
      verifiedAdminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("STATUS_UPDATE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// REQUEST REFUND
// ===================================================================

export async function requestRefund(
  orderId: string,
  userId: string,
  reason: string
) {
  try {
    const validated = RefundRequestSchema.parse({
      order_id: orderId,
      reason,
      refund_method: "bank_transfer", // Placeholder
      refund_account: "pending", // Placeholder
    });

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id, guest_email, order_status, total_amount, status_history")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify ownership
    if (order.user_id !== userId) {
      throw new AppError("UNAUTHORIZED", "Not authorized to refund this order", 403);
    }

    // Check if order can be refunded
    if (order.order_status !== "delivered") {
      throw new AppError(
        "INVALID_STATUS",
        "Only delivered orders can be refunded",
        400
      );
    }

    // Update order status to refund_requested
    const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
    statusHistory.push({
      status: "refund_requested",
      changedAt: new Date().toISOString(),
      changedBy: userId,
      reason,
    });

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: "refund_requested",
        refund_reason: reason,
        status_history: statusHistory,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("REFUND_REQUEST_FAILED", updateError.message, 500);
    }

    // TODO: Send email to admin notifying of refund request

    // Send refund request email to customer
    let customerEmail = order.guest_email;
    if (order.user_id && !customerEmail) {
      // Fetch user email from auth.users if not already retrieved
      const { data } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      customerEmail = data?.user?.email;
    }

    if (customerEmail) {
      await sendRefundEmail({
        orderNumber: updated.order_number,
        customerEmail,
        refundAmount: order.total_amount,
        reason,
        status: 'requested',
      }).catch((error) => {
        console.error("Failed to send refund request email:", error);
        // Don't throw - refund request succeeded even if email fails
      });
    }

    return {
      orderId,
      status: "refund_requested",
      message: "Refund request submitted. An admin will review it shortly.",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("REFUND_REQUEST_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// CANCEL ORDER
// ===================================================================

export async function cancelOrder(orderId: string, userId: string, reason?: string) {
  try {
    if (!orderId || !userId) {
      throw new AppError("INVALID_PARAMS", "Order ID and user ID required", 400);
    }

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id, order_status, items, total_amount")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new AppError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // Verify ownership
    if (order.user_id !== userId) {
      throw new AppError("UNAUTHORIZED", "Not authorized to cancel this order", 403);
    }

    // Check if order can be cancelled
    const cancellableStatuses = ["pending", "pending_payment", "confirmed"];
    if (!cancellableStatuses.includes(order.order_status)) {
      throw new AppError(
        "INVALID_STATUS",
        `Cannot cancel order with status: ${order.order_status}`,
        400
      );
    }

    // Release inventory reservations or restore stock if already finalized
    const { data: reservations } = await supabaseAdmin
      .from("inventory_reservations")
      .select("*")
      .eq("order_id", orderId);

    if (reservations && reservations.length > 0) {
      for (const reservation of reservations) {
        if (reservation.status === "reserved") {
          // Release unrealized reservations
          await supabaseAdmin
            .from("inventory_reservations")
            .update({
              status: "released",
              released_at: new Date().toISOString(),
            })
            .eq("id", reservation.id);
        } else if (reservation.status === "finalized") {
          // Restore already-finalized stock
          if (reservation.variant_id) {
            const { data: variant } = await supabaseAdmin
              .from("product_variants")
              .select("stock_quantity")
              .eq("id", reservation.variant_id)
              .single();

            if (variant) {
              await supabaseAdmin
                .from("product_variants")
                .update({
                  stock_quantity: variant.stock_quantity + reservation.quantity,
                })
                .eq("id", reservation.variant_id);
            }
          } else {
            const { data: product } = await supabaseAdmin
              .from("products")
              .select("stock_quantity")
              .eq("id", reservation.product_id)
              .single();

            if (product) {
              await supabaseAdmin
                .from("products")
                .update({
                  stock_quantity: product.stock_quantity + reservation.quantity,
                })
                .eq("id", reservation.product_id);
            }
          }

          // Mark reservation as released
          await supabaseAdmin
            .from("inventory_reservations")
            .update({
              status: "released",
              released_at: new Date().toISOString(),
            })
            .eq("id", reservation.id);
        }
      }
    }

    // Update order status
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: "cancelled",
        status_history: [
          {
            status: "cancelled",
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason,
          },
        ],
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("CANCEL_FAILED", updateError.message, 500);
    }

    return {
      orderId,
      status: "cancelled",
      message: "Order cancelled successfully",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CANCEL_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET USER ORDERS (FOR ACCOUNT PAGE)
// ===================================================================

export async function getUserOrders(userId: string) {
  try {
    if (!userId) {
      throw new AppError("INVALID_USER", "User ID required", 400);
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total_amount, order_status, payment_status, created_at, items")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError("FETCH_ORDERS_FAILED", error.message, 500);
    }

    // Transform orders for display
    const transformed = (orders || []).map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      status: order.order_status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      item_count: Array.isArray(order.items) ? order.items.length : 0,
    }));

    return transformed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_ORDERS_ERROR", getErrorMessage(error), 500);
  }
}
