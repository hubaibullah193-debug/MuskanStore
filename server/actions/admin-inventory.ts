"use server";

/**
 * Admin Inventory Management Server Actions
 * Adjust stock levels with reason tracking
 * All adjustments logged for audit trail
 */

import { supabase } from "@/lib/supabase/client";
import { InventoryAdjustmentSchema } from "@/lib/validation/schemas";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";
import { logAuditEvent } from "@/lib/supabase/helpers";

// ===================================================================
// ADJUST INVENTORY
// ===================================================================

export async function adjustInventory(
  adminId: string,
  productId: string,
  variantId: string | undefined,
  newQuantity: number,
  reason: "Damaged" | "Lost" | "Return" | "Physical Count" | "Correction" | "Other",
  notes?: string
) {
  try {
    // Validate input
    const validated = InventoryAdjustmentSchema.parse({
      product_id: productId,
      variant_id: variantId,
      new_quantity: newQuantity,
      reason,
      notes,
    });

    // Get current inventory
    let query = supabase
      .from("product_inventory")
      .select("id, quantity")
      .eq("product_id", productId);

    if (variantId) {
      query = query.eq("variant_id", variantId);
    } else {
      query = query.is("variant_id", null);
    }

    const { data: inventory, error: getError } = await query.single();

    if (getError || !inventory) {
      throw new AppError("INVENTORY_NOT_FOUND", "Inventory record not found", 404);
    }

    const oldQuantity = inventory.quantity;
    const difference = newQuantity - oldQuantity;

    // Update inventory
    const { data: updated, error: updateError } = await supabase
      .from("product_inventory")
      .update({ quantity: newQuantity })
      .eq("id", inventory.id)
      .select()
      .single();

    if (updateError) {
      throw new AppError("INVENTORY_UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event with details
    await logAuditEvent(
      "inventory_adjusted",
      "product_inventory",
      inventory.id,
      {
        productId,
        variantId,
        oldQuantity,
        newQuantity,
        difference,
        reason,
        notes,
      },
      adminId
    );

    return {
      inventoryId: inventory.id,
      oldQuantity,
      newQuantity,
      difference,
      reason,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADJUST_INVENTORY_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// SET LOW STOCK THRESHOLD (PER-PRODUCT OVERRIDE)
// ===================================================================

export async function setLowStockThreshold(
  adminId: string,
  productId: string,
  variantId: string | undefined,
  threshold: number
) {
  try {
    if (!productId || threshold < 0) {
      throw new AppError("INVALID_PARAMS", "Product ID and valid threshold required", 400);
    }

    // Get inventory
    let query = supabase
      .from("product_inventory")
      .select("id")
      .eq("product_id", productId);

    if (variantId) {
      query = query.eq("variant_id", variantId);
    } else {
      query = query.is("variant_id", null);
    }

    const { data: inventory, error: getError } = await query.single();

    if (getError || !inventory) {
      throw new AppError("INVENTORY_NOT_FOUND", "Inventory record not found", 404);
    }

    // Update threshold
    const { data: updated, error: updateError } = await supabase
      .from("product_inventory")
      .update({ low_stock_threshold: threshold })
      .eq("id", inventory.id)
      .select()
      .single();

    if (updateError) {
      throw new AppError("UPDATE_FAILED", updateError.message, 500);
    }

    // Log audit event
    await logAuditEvent(
      "low_stock_threshold_updated",
      "product_inventory",
      inventory.id,
      {
        productId,
        variantId,
        threshold,
      },
      adminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SET_THRESHOLD_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET ADJUSTMENT HISTORY
// ===================================================================

export async function getInventoryAdjustmentHistory(
  productId: string,
  variantId?: string,
  limit: number = 50
) {
  try {
    if (!productId || limit < 1 || limit > 500) {
      throw new AppError("INVALID_PARAMS", "Invalid product ID or limit", 400);
    }

    // Get inventory ID first
    let query = supabase
      .from("product_inventory")
      .select("id")
      .eq("product_id", productId);

    if (variantId) {
      query = query.eq("variant_id", variantId);
    } else {
      query = query.is("variant_id", null);
    }

    const { data: inventory, error: getError } = await query.single();

    if (getError || !inventory) {
      throw new AppError("INVENTORY_NOT_FOUND", "Inventory record not found", 404);
    }

    // Get adjustment logs
    const { data: logs, error: logsError } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("entity_type", "product_inventory")
      .eq("entity_id", inventory.id)
      .eq("action", "inventory_adjusted")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      throw new AppError("HISTORY_FETCH_FAILED", logsError.message, 500);
    }

    return logs || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADJUSTMENT_HISTORY_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET LOW STOCK ALERTS
// ===================================================================

export async function getLowStockAlerts() {
  try {
    // Get all inventory with product info
    const { data: allInventory, error } = await supabase
      .from("product_inventory")
      .select(
        `
        id,
        product_id,
        variant_id,
        quantity,
        reserved,
        low_stock_threshold,
        products (id, name, sku)
      `
      );

    if (error) {
      throw new AppError("FETCH_FAILED", error.message, 500);
    }

    // Filter client-side where quantity <= threshold
    const lowStockItems = (allInventory || []).filter(
      (item: any) => item.quantity <= item.low_stock_threshold
    );

    return lowStockItems.map((item: any) => ({
      inventoryId: item.id,
      productId: item.product_id,
      productName: item.products?.name,
      sku: item.products?.sku,
      variantId: item.variant_id,
      quantity: item.quantity,
      reserved: item.reserved,
      available: item.quantity - item.reserved,
      threshold: item.low_stock_threshold,
      isLow: item.quantity <= item.low_stock_threshold,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("LOW_STOCK_ALERT_ERROR", getErrorMessage(error), 500);
  }
}
