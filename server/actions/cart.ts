"use server";

/**
 * Cart Server Actions
 * All cart operations: add, update, remove, sync
 * Cart is synced with server database and validated server-side
 */

import { supabaseAdmin } from "@/lib/supabase/client";
import { CartItemSchema } from "@/lib/validation/schemas";
import { AppError, getErrorMessage, consolidateCartItems } from "@/lib/utils/helpers";

// ===================================================================
// GET OR CREATE CART
// ===================================================================

export async function getOrCreateCart(userId?: string, guestEmail?: string) {
  try {
    if (!userId && !guestEmail) {
      throw new AppError("INVALID_PARAMS", "Either userId or guestEmail required", 400);
    }

    // Fetch all cart items for this user/guest
    let query = supabaseAdmin.from("cart_items").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (guestEmail) {
      query = query.eq("guest_email", guestEmail).is("user_id", null);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError("CART_FETCH_FAILED", error.message, 500);
    }

    // Return cart items as array (schema uses individual rows, not JSONB)
    return data || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// ADD ITEM TO CART
// ===================================================================

export async function addToCart(
  userId: string,
  productId: string,
  variantId?: string,
  quantity: number = 1,
  guestEmail?: string
) {
  try {
    // Validate input
    if (!productId || quantity < 1) {
      throw new AppError("INVALID_PARAMS", "Invalid product ID or quantity", 400);
    }

    if (!userId && !guestEmail) {
      throw new AppError("INVALID_PARAMS", "Either userId or guestEmail required", 400);
    }

    CartItemSchema.parse({ product_id: productId, variant_id: variantId, quantity });

    // Validate product and get price
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, base_price, is_active")
      .eq("id", productId)
      .single();

    if (productError || !product || !product.is_active) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not available", 404);
    }

    // Get variant price adjustment if applicable
    let price = product.base_price;
    if (variantId) {
      const { data: variant } = await supabaseAdmin
        .from("product_variants")
        .select("price_adjustment")
        .eq("id", variantId)
        .eq("product_id", productId)
        .single();

      if (variant?.price_adjustment) {
        price = Number(product.base_price) + Number(variant.price_adjustment);
      }
    }

    // Check if item already in cart
    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId || null)
      .eq("guest_email", guestEmail || null)
      .eq("product_id", productId)
      .eq("variant_id", variantId || null)
      .single();

    if (existing) {
      // Update quantity
      const { error: updateError } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id);

      if (updateError) {
        throw new AppError("CART_UPDATE_FAILED", updateError.message, 500);
      }
    } else {
      // Add new item
      const { error: insertError } = await supabaseAdmin
        .from("cart_items")
        .insert({
          user_id: userId || null,
          guest_email: guestEmail || null,
          product_id: productId,
          variant_id: variantId || null,
          quantity,
          price,
        });

      if (insertError) {
        throw new AppError("CART_INSERT_FAILED", insertError.message, 500);
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADD_TO_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// UPDATE CART ITEM QUANTITY
// ===================================================================

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number = 1,
  userId?: string,
  guestEmail?: string
) {
  try {
    if (!cartItemId || quantity < 0) {
      throw new AppError("INVALID_PARAMS", "Invalid parameters", 400);
    }

    if (quantity === 0) {
      // Remove item instead
      return removeFromCart(cartItemId, userId, guestEmail);
    }

    // Update cart item quantity
    const { error: updateError } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId)
      .eq("user_id", userId || null)
      .eq("guest_email", guestEmail || null);

    if (updateError) {
      throw new AppError("CART_UPDATE_FAILED", updateError.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// REMOVE ITEM FROM CART
// ===================================================================

export async function removeFromCart(
  cartItemId: string,
  userId?: string,
  guestEmail?: string
) {
  try {
    if (!cartItemId) {
      throw new AppError("INVALID_PARAMS", "Cart item ID required", 400);
    }

    // Remove cart item
    const { error: deleteError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("user_id", userId || null)
      .eq("guest_email", guestEmail || null);

    if (deleteError) {
      throw new AppError("CART_DELETE_FAILED", deleteError.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("REMOVE_CART_ITEM_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// SYNC CART WITH SERVER
// ===================================================================

export async function syncCart(
  userId: string,
  guestEmail: string | null,
  clientItems: Array<{ product_id: string; variant_id?: string; quantity: number }>
) {
  try {
    if (!userId && !guestEmail) {
      throw new AppError("INVALID_PARAMS", "Either userId or guestEmail required", 400);
    }

    if (!Array.isArray(clientItems)) {
      throw new AppError("INVALID_PARAMS", "Items array required", 400);
    }

    // Clear existing cart items for this user/guest
    await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId || null)
      .eq("guest_email", guestEmail || null);

    // Validate and enrich items with current prices
    const validatedItems = [];

    for (const item of clientItems) {
      CartItemSchema.parse(item);

      // Get product price (server-side, don't trust client)
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, base_price, is_active")
        .eq("id", item.product_id)
        .single();

      if (productError || !product || !product.is_active) {
        throw new AppError("PRODUCT_NOT_FOUND", `Product ${item.product_id} not available`, 404);
      }

      let price = product.base_price;

      // Check variant price adjustment
      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin
          .from("product_variants")
          .select("price_adjustment")
          .eq("id", item.variant_id)
          .eq("product_id", item.product_id)
          .single();

        if (variant?.price_adjustment) {
          price = Number(product.base_price) + Number(variant.price_adjustment);
        }
      }

      validatedItems.push({
        user_id: userId || null,
        guest_email: guestEmail || null,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price, // Server-calculated price
      });
    }

    // Insert validated items
    if (validatedItems.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("cart_items")
        .insert(validatedItems);

      if (insertError) {
        throw new AppError("CART_SYNC_FAILED", insertError.message, 500);
      }
    }

    return { success: true, itemCount: validatedItems.length };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SYNC_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// CLEAR CART
// ===================================================================

export async function clearCart(userId: string | null, guestEmail?: string | null) {
  try {
    if (!userId && !guestEmail) {
      throw new AppError("INVALID_PARAMS", "Either userId or guestEmail required", 400);
    }

    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId || null)
      .eq("guest_email", guestEmail || null);

    if (error) {
      throw new AppError("CART_CLEAR_FAILED", error.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CLEAR_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// VALIDATE CART INVENTORY (BEFORE CHECKOUT)
// ===================================================================

export async function validateCartInventory(
  items: Array<{ product_id: string; variant_id?: string; quantity: number }>
) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("EMPTY_CART", "Cart is empty", 400);
    }

    const errors = [];

    for (const item of items) {
      if (item.variant_id) {
        // Check variant stock
        const { data: variant, error: variantError } = await supabaseAdmin
          .from("product_variants")
          .select("stock_quantity, is_active")
          .eq("id", item.variant_id)
          .eq("product_id", item.product_id)
          .single();

        if (variantError || !variant || !variant.is_active) {
          errors.push({
            productId: item.product_id,
            error: "Variant not found or out of stock",
          });
          continue;
        }

        if (variant.stock_quantity < item.quantity) {
          errors.push({
            productId: item.product_id,
            error: `Only ${variant.stock_quantity} units available, requested ${item.quantity}`,
            available: variant.stock_quantity,
          });
        }
      } else {
        // Check base product stock
        const { data: product, error: productError } = await supabaseAdmin
          .from("products")
          .select("stock_quantity, is_active")
          .eq("id", item.product_id)
          .single();

        if (productError || !product || !product.is_active) {
          errors.push({
            productId: item.product_id,
            error: "Product not found or out of stock",
          });
          continue;
        }

        if (product.stock_quantity < item.quantity) {
          errors.push({
            productId: item.product_id,
            error: `Only ${product.stock_quantity} units available, requested ${item.quantity}`,
            available: product.stock_quantity,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError("INVENTORY_INSUFFICIENT", "Some items are out of stock", 400);
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVENTORY_VALIDATION_ERROR", getErrorMessage(error), 500);
  }
}
