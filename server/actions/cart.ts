"use server";

/**
 * Cart Server Actions
 * All cart operations: add, update, remove, sync
 * Cart is synced with server database and validated server-side
 */

import { supabase } from "@/lib/supabase/client";
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

    let query = supabase.from("carts").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (guestEmail) {
      query = query.eq("guest_email", guestEmail).is("user_id", null);
    }

    const { data, error } = await query.single();

    if (error && error.code === "PGRST116") {
      // Cart doesn't exist, create new one
      const newCart = {
        user_id: userId || null,
        guest_email: guestEmail || null,
        items: [],
      };

      const { data: created, error: createError } = await supabase
        .from("carts")
        .insert([newCart])
        .select()
        .single();

      if (createError) {
        throw new AppError("CART_CREATE_FAILED", createError.message, 500);
      }

      return created;
    }

    if (error) {
      throw new AppError("CART_FETCH_FAILED", error.message, 500);
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// ADD ITEM TO CART
// ===================================================================

export async function addToCart(
  cartId: string,
  productId: string,
  variantId?: string,
  quantity: number = 1,
  userId?: string,
  guestEmail?: string
) {
  try {
    // Validate input
    if (!cartId || !productId || quantity < 1) {
      throw new AppError("INVALID_PARAMS", "Invalid cart ID, product ID, or quantity", 400);
    }

    CartItemSchema.parse({ product_id: productId, variant_id: variantId, quantity });

    // Get current cart
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("items")
      .eq("id", cartId)
      .single();

    if (cartError || !cart) {
      throw new AppError("CART_NOT_FOUND", "Cart not found", 404);
    }

    // Validate product and get price
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price, is_active")
      .eq("id", productId)
      .single();

    if (productError || !product || !product.is_active) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not available", 404);
    }

    // Get variant price override if applicable
    let price = product.price;
    if (variantId) {
      const { data: variant } = await supabase
        .from("variants")
        .select("price_override")
        .eq("id", variantId)
        .eq("product_id", productId)
        .single();

      if (variant?.price_override) {
        price = variant.price_override;
      }
    }

    // Parse existing items
    const items = Array.isArray(cart.items) ? cart.items : [];

    // Check if item already in cart
    const key = `${productId}:${variantId || "none"}`;
    const existingIndex = items.findIndex(
      (item: any) => `${item.product_id}:${item.variant_id || "none"}` === key
    );

    if (existingIndex >= 0) {
      // Update quantity
      items[existingIndex].quantity += quantity;
    } else {
      // Add new item
      items.push({
        product_id: productId,
        variant_id: variantId,
        quantity,
        price,
      });
    }

    // Update cart in database
    const { data: updated, error: updateError } = await supabase
      .from("carts")
      .update({
        items,
        last_activity: new Date().toISOString(),
      })
      .eq("id", cartId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("CART_UPDATE_FAILED", updateError.message, 500);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("ADD_TO_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// UPDATE CART ITEM QUANTITY
// ===================================================================

export async function updateCartItemQuantity(
  cartId: string,
  productId: string,
  variantId?: string,
  quantity: number = 1
) {
  try {
    if (!cartId || !productId || quantity < 0) {
      throw new AppError("INVALID_PARAMS", "Invalid parameters", 400);
    }

    if (quantity === 0) {
      // Remove item instead
      return removeFromCart(cartId, productId, variantId);
    }

    // Get current cart
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("items")
      .eq("id", cartId)
      .single();

    if (cartError || !cart) {
      throw new AppError("CART_NOT_FOUND", "Cart not found", 404);
    }

    const items = Array.isArray(cart.items) ? cart.items : [];
    const key = `${productId}:${variantId || "none"}`;

    const itemIndex = items.findIndex(
      (item: any) => `${item.product_id}:${item.variant_id || "none"}` === key
    );

    if (itemIndex < 0) {
      throw new AppError("ITEM_NOT_IN_CART", "Item not in cart", 404);
    }

    items[itemIndex].quantity = quantity;

    // Update cart
    const { data: updated, error: updateError } = await supabase
      .from("carts")
      .update({
        items,
        last_activity: new Date().toISOString(),
      })
      .eq("id", cartId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("CART_UPDATE_FAILED", updateError.message, 500);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UPDATE_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// REMOVE ITEM FROM CART
// ===================================================================

export async function removeFromCart(
  cartId: string,
  productId: string,
  variantId?: string
) {
  try {
    if (!cartId || !productId) {
      throw new AppError("INVALID_PARAMS", "Cart ID and product ID required", 400);
    }

    // Get current cart
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("items")
      .eq("id", cartId)
      .single();

    if (cartError || !cart) {
      throw new AppError("CART_NOT_FOUND", "Cart not found", 404);
    }

    const items = Array.isArray(cart.items) ? cart.items : [];
    const key = `${productId}:${variantId || "none"}`;

    const filtered = items.filter(
      (item: any) => `${item.product_id}:${item.variant_id || "none"}` !== key
    );

    if (filtered.length === items.length) {
      throw new AppError("ITEM_NOT_IN_CART", "Item not in cart", 404);
    }

    // Update cart
    const { data: updated, error: updateError } = await supabase
      .from("carts")
      .update({
        items: filtered,
        last_activity: new Date().toISOString(),
      })
      .eq("id", cartId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("CART_UPDATE_FAILED", updateError.message, 500);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("REMOVE_CART_ITEM_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// SYNC CART WITH SERVER
// ===================================================================

export async function syncCart(
  cartId: string,
  clientItems: Array<{ product_id: string; variant_id?: string; quantity: number }>
) {
  try {
    if (!cartId || !Array.isArray(clientItems)) {
      throw new AppError("INVALID_PARAMS", "Cart ID and items array required", 400);
    }

    // Validate and enrich items with current prices
    const validatedItems = [];

    for (const item of clientItems) {
      CartItemSchema.parse(item);

      // Get product price (server-side, don't trust client)
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, price, is_active")
        .eq("id", item.product_id)
        .single();

      if (productError || !product || !product.is_active) {
        throw new AppError("PRODUCT_NOT_FOUND", `Product ${item.product_id} not available`, 404);
      }

      let price = product.price;

      // Check variant price override
      if (item.variant_id) {
        const { data: variant } = await supabase
          .from("variants")
          .select("price_override")
          .eq("id", item.variant_id)
          .eq("product_id", item.product_id)
          .single();

        if (variant?.price_override) {
          price = variant.price_override;
        }
      }

      validatedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price, // Server-calculated price
      });
    }

    // Consolidate items (combine duplicates)
    const consolidated = consolidateCartItems(validatedItems as any);

    // Update cart
    const { data: updated, error: updateError } = await supabase
      .from("carts")
      .update({
        items: consolidated,
        last_activity: new Date().toISOString(),
      })
      .eq("id", cartId)
      .select()
      .single();

    if (updateError) {
      throw new AppError("CART_SYNC_FAILED", updateError.message, 500);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SYNC_CART_ERROR", getErrorMessage(error), 500);
  }
}

// ===================================================================
// CLEAR CART
// ===================================================================

export async function clearCart(cartId: string) {
  try {
    if (!cartId) {
      throw new AppError("INVALID_PARAMS", "Cart ID required", 400);
    }

    const { data: updated, error } = await supabase
      .from("carts")
      .update({
        items: [],
        last_activity: new Date().toISOString(),
      })
      .eq("id", cartId)
      .select()
      .single();

    if (error) {
      throw new AppError("CART_CLEAR_FAILED", error.message, 500);
    }

    return updated;
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
      // Check inventory availability
      let query = supabase
        .from("product_inventory")
        .select("quantity, reserved")
        .eq("product_id", item.product_id);

      if (item.variant_id) {
        query = query.eq("variant_id", item.variant_id);
      } else {
        query = query.is("variant_id", null);
      }

      const { data: inventory, error: inventoryError } = await query.single();

      if (inventoryError || !inventory) {
        errors.push({
          productId: item.product_id,
          error: "Product not found or out of stock",
        });
        continue;
      }

      const available = inventory.quantity - inventory.reserved;
      if (available < item.quantity) {
        errors.push({
          productId: item.product_id,
          error: `Only ${available} units available, requested ${item.quantity}`,
          available,
        });
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
