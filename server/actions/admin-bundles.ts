"use server";

/**
 * Admin Bundle Management Server Actions
 * Create, update, delete, list bundles
 * All operations logged to audit trail
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import {
  BundleCreateSchema,
  BundleUpdateSchema,
} from "@/lib/validation/schemas";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";
import { logAuditEvent } from "@/lib/supabase/helpers";

// ===================================================================
// GET ALL BUNDLES (ADMIN)
// ===================================================================

export async function getAllBundles() {
  try {
    const { data, error } = await supabaseAdmin.from("bundles")
      .select(
        `
        id,
        name,
        description,
        bundle_price,
        regular_price,
        discount_percent,
        is_active,
        active_from,
        active_to,
        created_at,
        bundle_items (
          id,
          product_id,
          variant_id,
          quantity,
          products (id, name, base_price),
          product_variants (variant_name, price_adjustment)
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("FETCH_BUNDLES_FAILED", error.message, 500);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_BUNDLES_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// GET BUNDLE BY ID
// ===================================================================

export async function getBundleAdmin(bundleId: string) {
  try {
    if (!bundleId) {
      throw new AppError("INVALID_ID", "Bundle ID required", 400);
    }

    const { data, error } = await supabaseAdmin.from("bundles")
      .select(
        `
        *,
        bundle_items (
          id,
          product_id,
          variant_id,
          quantity,
          products (id, name, base_price),
          product_variants (variant_name, price_adjustment)
        )
      `
      )
      .eq("id", bundleId)
      .single();

    if (error || !data) {
      throw new AppError("BUNDLE_NOT_FOUND", "Bundle not found", 404);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GET_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// CREATE BUNDLE
// ===================================================================

export async function createBundle(
  data: {
    name: string;
    description?: string;
    bundle_price: number;
    items: Array<{
      product_id: string;
      variant_id?: string;
      quantity: number;
    }>;
    active_from?: string;
    active_to?: string;
  }
) {
  // Resolve the acting admin from the session — never trust a client-supplied id
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  const adminId = adminAccess.userId;

  try {
    if (!data.items || data.items.length < 2) {
      throw new AppError("INVALID_ITEMS", "Bundle must have at least 2 items", 400);
    }

    // Validate with Zod
    const validated = BundleCreateSchema.parse({
      name: data.name,
      description: data.description,
      bundle_price: data.bundle_price,
      regular_price: 0, // computed below
      items: data.items,
      active_from: data.active_from,
      active_to: data.active_to,
    });

    // Compute regular_price from products
    let regularPrice = 0;
    for (const item of data.items) {
      const { data: product, error: prodError } = await supabaseAdmin.from("products")
        .select("base_price")
        .eq("id", item.product_id)
        .single();

      if (prodError || !product) {
        throw new AppError(
          "PRODUCT_NOT_FOUND",
          `Product ${item.product_id} not found`,
          404
        );
      }

      let itemPrice = Number(product.base_price);

      // Add variant adjustment if specified
      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin.from("product_variants")
          .select("price_adjustment")
          .eq("id", item.variant_id)
          .single();

        if (variant?.price_adjustment) {
          itemPrice += Number(variant.price_adjustment);
        }
      }

      regularPrice += itemPrice * item.quantity;
    }

    // Calculate discount percent
    const discountPercent =
      regularPrice > 0
        ? Math.round(((regularPrice - data.bundle_price) / regularPrice) * 100 * 100) / 100
        : 0;

    // Insert bundle
    const { data: bundle, error: bundleError } = await supabaseAdmin.from("bundles")
      .insert({
        name: validated.name,
        description: validated.description,
        bundle_price: validated.bundle_price,
        regular_price: regularPrice,
        discount_percent: discountPercent,
        is_active: true,
        active_from: data.active_from || null,
        active_to: data.active_to || null,
      })
      .select()
      .single();

    if (bundleError || !bundle) {
      throw new AppError("BUNDLE_CREATE_FAILED", bundleError?.message || "Failed to create bundle", 500);
    }

    // Insert bundle items
    const bundleItems = data.items.map((item) => ({
      bundle_id: bundle.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin.from("bundle_items")
      .insert(bundleItems);

    if (itemsError) {
      // Rollback bundle
      await supabaseAdmin.from("bundles").delete().eq("id", bundle.id);
      throw new AppError("BUNDLE_ITEMS_FAILED", itemsError.message, 500);
    }

    // Audit log
    await logAuditEvent(
      "bundle_created",
      "bundle",
      bundle.id,
      {
        name: bundle.name,
        bundlePrice: bundle.bundle_price,
        regularPrice: bundle.regular_price,
        discountPercent: bundle.discount_percent,
        itemCount: data.items.length,
      },
      adminId
    );

    return bundle;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CREATE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// UPDATE BUNDLE
// ===================================================================

export async function updateBundle(
  bundleId: string,
  updates: {
    name?: string;
    description?: string;
    bundle_price?: number;
    is_active?: boolean;
    active_from?: string | null;
    active_to?: string | null;
  }
) {
  // Resolve the acting admin from the session — never trust a client-supplied id
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  const adminId = adminAccess.userId;

  try {
    if (!bundleId) {
      throw new AppError("INVALID_ID", "Bundle ID required", 400);
    }

    // Get current bundle
    const { data: current, error: getError } = await supabaseAdmin.from("bundles")
      .select("id, bundle_price, regular_price")
      .eq("id", bundleId)
      .single();

    if (getError || !current) {
      throw new AppError("BUNDLE_NOT_FOUND", "Bundle not found", 404);
    }

    const validated = BundleUpdateSchema.parse(updates);

    // Recalculate discount if price changed
    const updateData: Record<string, any> = { ...validated };
    if (validated.bundle_price && current.regular_price) {
      updateData.discount_percent =
        Math.round(
          ((current.regular_price - validated.bundle_price) / current.regular_price) * 100 * 100
        ) / 100;
    }

    const { data: updated, error: updateError } = await supabaseAdmin.from("bundles")
      .update(updateData)
      .eq("id", bundleId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("BUNDLE_UPDATE_FAILED", updateError.message, 500);
    }

    await logAuditEvent(
      "bundle_updated",
      "bundle",
      bundleId,
      { changes: validated },
      adminId
    );

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// DELETE BUNDLE (SOFT)
// ===================================================================

export async function deleteBundle(bundleId: string) {
  // Resolve the acting admin from the session — never trust a client-supplied id
  const { verifyAdminAccess } = await import("./auth");
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    throw new AppError("UNAUTHORIZED", "Admin access required", 403);
  }
  const adminId = adminAccess.userId;

  try {
    if (!bundleId) {
      throw new AppError("INVALID_ID", "Bundle ID required", 400);
    }

    // Soft delete - just deactivate
    const { data: updated, error } = await supabaseAdmin.from("bundles")
      .update({ is_active: false })
      .eq("id", bundleId)
      .select()
      .single();

    if (error) {
      throw new AppError("DELETE_FAILED", error.message, 500);
    }

    await logAuditEvent("bundle_deleted", "bundle", bundleId, {}, adminId);

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("DELETE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}
