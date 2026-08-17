/**
 * Supabase Helper Functions
 * Reusable queries and operations across the app
 * All queries respect RLS policies automatically
 */

import { supabase, supabaseAdmin } from "./client";
import { Database } from "@/types/database";

// ===================================================================
// PRODUCT HELPERS
// ===================================================================

export async function getActiveProducts(
  limit: number = 20,
  offset: number = 0,
  categoryId?: string
) {
  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      description,
      sku,
      base_price,
      category_id,
      is_active,
      created_at,
      product_images (id, image_url, display_order),
      product_inventory (quantity, reserved)
    `
    )
    .eq("is_active", true)
    .range(offset, offset + limit - 1);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  return query.order("created_at", { ascending: false });
}

export async function getProductById(productId: string) {
  return supabase
    .from("products")
    .select(
      `
      id,
      name,
      description,
      sku,
      base_price,
      category_id,
      is_active,
      created_at,
      product_images (id, image_url, display_order),
      product_variants (id, variant_name, sku, price_adjustment),
      product_inventory (quantity, reserved, low_stock_threshold)
    `
    )
    .eq("id", productId)
    .single();
}

export async function searchProducts(query: string, limit: number = 20) {
  return supabase
    .from("products")
    .select(
      `
      id,
      name,
      base_price,
      product_images (image_url)
    `
    )
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    .limit(limit);
}

// ===================================================================
// INVENTORY HELPERS
// ===================================================================

export async function checkInventoryAvailable(
  productId: string,
  variantId?: string,
  quantity: number = 1
) {
  let query = supabase
    .from("product_inventory")
    .select("quantity, reserved")
    .eq("product_id", productId);

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data, error } = await query.single();

  if (error) return false;

  const available = (data?.quantity || 0) - (data?.reserved || 0);
  return available >= quantity;
}

export async function getProductInventory(productId: string, variantId?: string) {
  let query = supabase
    .from("product_inventory")
    .select("id, quantity, reserved, low_stock_threshold")
    .eq("product_id", productId);

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  return query.single();
}

// ===================================================================
// ORDER HELPERS
// ===================================================================

export async function getCustomerOrders(userId: string, limit: number = 20, offset: number = 0) {
  return supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      order_status,
      payment_status,
      total_amount,
      created_at,
      updated_at
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function getOrderById(orderId: string) {
  return supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      user_id,
      guest_email,
      items,
      delivery_address,
      order_status,
      payment_method,
      payment_status,
      total_amount,
      subtotal,
      tax_amount,
      delivery_fee,
      payment_fee,
      status_history,
      created_at,
      updated_at
    `
    )
    .eq("id", orderId)
    .single();
}

export async function generateOrderNumber(): Promise<string> {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

// ===================================================================
// CATEGORY HELPERS
// ===================================================================

export async function getAllCategories() {
  return supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name", { ascending: true });
}

export async function getCategoryBySlug(slug: string) {
  return supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .eq("slug", slug)
    .single();
}

// ===================================================================
// BUNDLE HELPERS
// ===================================================================

export async function getActiveBundles() {
  const now = new Date().toISOString();

  return supabase
    .from("bundles")
    .select(
      `
      id,
      name,
      description,
      bundle_price,
      regular_price,
      discount_percent,
      bundle_items (product_id, variant_id, quantity, products(name, base_price), product_variants(variant_name, price_adjustment))
    `
    )
    .eq("is_active", true)
    .or(`active_from.is.null,active_from.lte.${now}`)
    .or(`active_to.is.null,active_to.gte.${now}`);
}

export async function getBundleById(bundleId: string) {
  return supabase
    .from("bundles")
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
      bundle_items (
        product_id,
        variant_id,
        quantity,
        products (id, name, base_price),
        product_variants (id, variant_name, price_adjustment)
      )
    `
    )
    .eq("id", bundleId)
    .single();
}

// ===================================================================
// SERVICE AREA HELPERS
// ===================================================================

export async function getActiveServiceAreas() {
  return supabase
    .from("service_areas")
    .select("id, city, postal_code_range")
    .eq("is_active", true)
    .order("city", { ascending: true });
}

export async function validateDeliveryCity(city: string) {
  return supabase
    .from("service_areas")
    .select("id")
    .eq("city", city)
    .eq("is_active", true)
    .single();
}

// ===================================================================
// SETTINGS HELPERS
// ===================================================================

export async function getSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value");

  if (error) return null;

  return data?.reduce(
    (acc, setting) => ({
      ...acc,
      [setting.key]: setting.value,
    }),
    {}
  );
}

export async function getSetting(key: string) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();

  return error ? null : data?.value;
}

// ===================================================================
// USER HELPERS
// ===================================================================

export async function getUserProfile(userId: string) {
  return supabase
    .from("users")
    .select("id, email, name, phone, role, email_verified, created_at")
    .eq("id", userId)
    .single();
}

// ===================================================================
// AUDIT LOG HELPERS
// ===================================================================

export async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>,
  adminId?: string,
  ipAddress?: string
) {
  return supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    entity_type: resourceType,
    entity_id: resourceId,
    changes: details || null,
  });
}

// ===================================================================
// PAYMENT HELPERS
// ===================================================================

export async function recordPaymentAttempt(
  orderId: string,
  gatewayResponseCode?: string,
  errorReason?: string,
  isCountedFailure: boolean = false
) {
  // Get current attempt count
  const { data: attempts } = await supabaseAdmin
    .from("payment_attempts")
    .select("attempt_number")
    .eq("order_id", orderId)
    .order("attempted_at", { ascending: false })
    .limit(1);

  const attemptNumber = (attempts?.[0]?.attempt_number || 0) + 1;

  return supabaseAdmin.from("payment_attempts").insert({
    order_id: orderId,
    attempt_number: attemptNumber,
    gateway_response_code: gatewayResponseCode,
    error_reason: errorReason,
    is_counted_failure: isCountedFailure,
  });
}

export async function getPaymentAttempts(orderId: string) {
  return supabase
    .from("payment_attempts")
    .select("attempt_number, is_counted_failure, error_reason, attempted_at")
    .eq("order_id", orderId)
    .order("attempted_at", { ascending: true });
}

// ===================================================================
// EMAIL LOG HELPERS
// ===================================================================

export async function logEmailSent(
  recipientEmail: string,
  emailType: string,
  subject: string,
  referenceId?: string,
  referenceType?: string
) {
  return supabaseAdmin.from("email_logs").insert({
    recipient_email: recipientEmail,
    email_type: emailType,
    subject,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
    status: "sent",
    sent_at: new Date().toISOString(),
  });
}
