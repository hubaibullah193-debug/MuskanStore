/**
 * Inventory Finalization Helper
 * Finalizes reserved inventory to permanent stock reduction after payment verification
 * Handles idempotency and duplicate webhook protection
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import { AppError } from "@/lib/utils/helpers";
import crypto from "crypto";

/**
 * Record webhook processing to prevent duplicate inventory finalization
 */
export async function recordWebhookProcessing(
  orderId: string,
  transactionId: string,
  paymentGateway: "jazz_cash" | "easypaisa",
  webhookPayload: Record<string, any>
) {
  try {
    // Create hash of webhook payload for exact duplicate detection
    const webhookHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(webhookPayload))
      .digest("hex");

    // Check if this exact webhook was already processed
    const { data: existing } = await supabaseAdmin
      .from("webhook_processing")
      .select("id, status")
      .eq("order_id", orderId)
      .eq("transaction_id", transactionId)
      .eq("payment_gateway", paymentGateway)
      .eq("webhook_hash", webhookHash)
      .single();

    if (existing) {
      return { isDuplicate: true, wasProcessed: existing.status === "processed" };
    }

    // Record this webhook processing
    await supabaseAdmin
      .from("webhook_processing")
      .insert({
        order_id: orderId,
        transaction_id: transactionId,
        payment_gateway: paymentGateway,
        webhook_hash: webhookHash,
        status: "processed",
      });

    return { isDuplicate: false, wasProcessed: false };
  } catch (error) {
    console.error("Failed to record webhook processing:", error);
    throw new AppError("WEBHOOK_RECORD_FAILED", "Failed to record webhook", 500);
  }
}

/**
 * Finalize inventory reservations after verified payment
 * Converts temporary reservations to permanent stock reduction
 */
export async function finalizeInventory(orderId: string) {
  try {
    // Get all reserved inventory for this order
    const { data: reservations, error: fetchError } = await supabaseAdmin
      .from("inventory_reservations")
      .select("*")
      .eq("order_id", orderId)
      .eq("status", "reserved");

    if (fetchError) {
      throw new AppError("FETCH_RESERVATIONS_FAILED", fetchError.message, 500);
    }

    if (!reservations || reservations.length === 0) {
      // No reservations to finalize - might be COD order or already finalized
      return { success: true, reservationsFinalized: 0 };
    }

    // Finalize each reservation by:
    // 1. Reducing product/variant stock_quantity
    // 2. Marking reservation as finalized
    let finalized = 0;

    for (const reservation of reservations) {
      try {
        if (reservation.variant_id) {
          const { data: variant } = await supabaseAdmin
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", reservation.variant_id)
            .single();

          if (variant) {
            await supabaseAdmin
              .from("product_variants")
              .update({ stock_quantity: Math.max(0, variant.stock_quantity - reservation.quantity) })
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
              .update({ stock_quantity: Math.max(0, product.stock_quantity - reservation.quantity) })
              .eq("id", reservation.product_id);
          }
        }

        // Mark reservation as finalized
        await supabaseAdmin
          .from("inventory_reservations")
          .update({
            status: "finalized",
            finalized_at: new Date().toISOString(),
          })
          .eq("id", reservation.id);

        finalized++;
      } catch (error) {
        console.error(`Failed to finalize reservation ${reservation.id}:`, error);
        // Continue with other reservations even if one fails
      }
    }

    return { success: true, reservationsFinalized: finalized };
  } catch (error) {
    console.error("Failed to finalize inventory:", error);
    throw error;
  }
}

/**
 * Release inventory reservations (on payment failure or cancellation)
 * Marks reservations as released so they don't expire and block reordering
 */
export async function releaseInventoryReservations(orderId: string) {
  try {
    const { error } = await supabaseAdmin
      .from("inventory_reservations")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("status", "reserved");

    if (error) {
      console.error("Failed to release inventory reservations:", error);
      // Don't throw - releasing is best-effort
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to release inventory:", error);
    return { success: false };
  }
}
