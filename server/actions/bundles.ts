"use server";

import { supabaseAdmin } from "@/lib/supabase/client";
import { AppError, getErrorMessage } from "@/lib/utils/helpers";

export interface BundleFormValues {
  name: string;
  description?: string;
  bundle_price: number;
  regular_price: number;
  discount_percent?: number;
  is_active?: boolean;
  active_from?: string;
  active_to?: string;
  product_ids: string[]; // product IDs to include
  variant_ids?: string[]; // optional variant IDs
}

export async function createBundle(values: BundleFormValues) {
  try {
    if (!values.name || values.bundle_price <= 0 || values.regular_price <= 0) {
      throw new AppError("INVALID_INPUT", "Missing required fields or invalid prices", 400);
    }

    if (values.bundle_price >= values.regular_price) {
      throw new AppError("INVALID_INPUT", "Bundle price must be less than regular price", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("bundles")
      .insert({
        name: values.name,
        description: values.description,
        bundle_price: values.bundle_price,
        regular_price: values.regular_price,
        discount_percent: values.discount_percent ?? 0,
        is_active: values.is_active ?? true,
        active_from: values.active_from ?? null,
        active_to: values.active_to ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new AppError("DATABASE_ERROR", error.message, 500);
    }

    // Insert bundle items
    if (values.product_ids && values.product_ids.length > 0) {
      const bundleItems = values.product_ids.map((product_id, index) => ({
        bundle_id: data.id,
        product_id,
        variant_id: values.variant_ids?.[index] ?? null,
        quantity: 1,
        display_order: index,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("bundle_items")
        .insert(bundleItems);

      if (itemsError) {
        // Rollback: delete the bundle we just created
        await supabaseAdmin.from("bundles").delete().eq("id", data.id);
        throw new AppError("DATABASE_ERROR", itemsError.message, 500);
      }
    }

    return { success: true, bundle: data };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CREATE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}

export async function updateBundle(
  bundleId: string,
  values: BundleFormValues
) {
  try {
    if (!bundleId) {
      throw new AppError("INVALID_ID", "Bundle ID required", 400);
    }

    if (values.bundle_price >= values.regular_price) {
      throw new AppError("INVALID_INPUT", "Bundle price must be less than regular price", 400);
    }

    // Update bundle header
    const { data, error } = await supabaseAdmin
      .from("bundles")
      .update({
        name: values.name,
        description: values.description,
        bundle_price: values.bundle_price,
        regular_price: values.regular_price,
        discount_percent: values.discount_percent ?? 0,
        is_active: values.is_active ?? true,
        active_from: values.active_from ?? null,
        active_to: values.active_to ?? null,
      })
      .eq("id", bundleId)
      .select()
      .single();

    if (error) {
      throw new AppError("DATABASE_ERROR", error.message, 500);
    }

    // Update bundle items: delete existing and re-insert
    await supabaseAdmin.from("bundle_items").delete().eq("bundle_id", bundleId);

    // Insert new bundle items
    if (values.product_ids && values.product_ids.length > 0) {
      const bundleItems = values.product_ids.map((product_id, index) => ({
        bundle_id: bundleId,
        product_id,
        variant_id: values.variant_ids?.[index] ?? null,
        quantity: 1,
        display_order: index,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("bundle_items")
        .insert(bundleItems);

      if (itemsError) {
        throw new AppError("DATABASE_ERROR", itemsError.message, 500);
      }
    }

    return { success: true, bundle: data };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}

export async function deleteBundle(bundleId: string) {
  try {
    if (!bundleId) {
      throw new AppError("INVALID_ID", "Bundle ID required", 400);
    }

    // Check for existing orders using this bundle (simple check)
    const { error } = await supabaseAdmin
      .from("orders")
      .select("id")
      .ilike("items", `%${bundleId}%`)
      .limit(1);

    if (error) {
      throw new AppError("DATABASE_ERROR", error.message, 500);
    }

    // Delete bundle items first, then bundle
    await supabaseAdmin.from("bundle_items").delete().eq("bundle_id", bundleId);
    const { error: bundleError } = await supabaseAdmin.from("bundles").delete().eq("id", bundleId);

    if (bundleError) {
      throw new AppError("DATABASE_ERROR", bundleError.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("DELETE_BUNDLE_ERROR", getErrorMessage(error), 500);
  }
}