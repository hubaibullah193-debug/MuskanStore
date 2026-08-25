'use server';

/**
 * Cart Server Actions
 * Manage shopping cart - move from localStorage to Supabase
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { AppError } from '@/lib/utils/helpers';
import { addBundleToCart as addBundleToCartServer } from '@/server/actions/cart';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
}

// ===================================================================
// GET CART
// ===================================================================

export async function getCartAction(userId?: string) {
  try {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select('id, product_id, variant_id, quantity, price, bundle_id, bundle_items_snapshot, products(name, product_images(image_url))')
      .eq('user_id', userId);

    if (error) {
      throw new AppError('CART_FETCH_FAILED', error.message, 500);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id ?? undefined,
      variantId: item.variant_id ?? undefined,
      bundleId: item.bundle_id ?? undefined,
      quantity: item.quantity,
      price: item.price,
      name: item.product_id ? item.products?.name : (item.bundle_items_snapshot as any)?.name,
      image: item.products?.product_images?.[0]?.image_url ?? undefined,
      isBundle: !!item.bundle_id,
      bundleItems: item.bundle_id ? (item.bundle_items_snapshot as any)?.items : undefined,
    }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('CART_FETCH_ERROR', 'Failed to fetch cart', 500);
  }
}

// ===================================================================
// ADD TO CART
// ===================================================================

export async function addToCartAction(
  userId: string,
  productId: string,
  variantId: string | undefined,
  quantity: number,
  price: number
) {
  try {
    if (quantity < 1) {
      throw new AppError('INVALID_QUANTITY', 'Quantity must be at least 1', 400);
    }

    // Check if item already exists
    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single();

    if (existing) {
      // Update quantity
      const { error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);

      if (error) {
        throw new AppError('CART_UPDATE_FAILED', error.message, 500);
      }
    } else {
      // Insert new item
      const { error } = await supabaseAdmin
        .from('cart_items')
        .insert({
          user_id: userId,
          product_id: productId,
          variant_id: variantId,
          quantity,
          price,
        });

      if (error) {
        throw new AppError('CART_INSERT_FAILED', error.message, 500);
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('ADD_TO_CART_ERROR', 'Failed to add item to cart', 500);
  }
}

// ===================================================================
// ADD BUNDLE TO CART
// ===================================================================

export async function addBundleToCartAction(
  userId: string,
  bundleId: string,
  quantity: number
) {
  try {
    if (!userId && !bundleId) {
      throw new AppError('INVALID_PARAMS', 'User and bundle required', 400);
    }

    // Guests are handled client-side via localStorage; this server action is
    // only used for authenticated users (the hook falls back to localStorage
    // for guests). If a guest reaches here, treat as an error.
    if (!userId) {
      throw new AppError('INVALID_PARAMS', 'Sign in to add bundles to your cart', 400);
    }

    const result = await addBundleToCartServer(userId, null, bundleId, quantity);
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('ADD_BUNDLE_TO_CART_ERROR', 'Failed to add bundle to cart', 500);
  }
}

// ===================================================================
// UPDATE CART ITEM
// ===================================================================

export async function updateCartItemAction(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  try {
    if (quantity < 1) {
      throw new AppError('INVALID_QUANTITY', 'Quantity must be at least 1', 400);
    }

    const { error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('CART_UPDATE_FAILED', error.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('UPDATE_CART_ERROR', 'Failed to update cart item', 500);
  }
}

// ===================================================================
// REMOVE FROM CART
// ===================================================================

export async function removeFromCartAction(userId: string, cartItemId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('CART_DELETE_FAILED', error.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('REMOVE_FROM_CART_ERROR', 'Failed to remove item from cart', 500);
  }
}

// ===================================================================
// MERGE GUEST CART INTO USER CART
// ===================================================================

export async function mergeGuestCartAction(
  userId: string,
  guestItems: Array<{
    productId?: string;
    bundleId?: string;
    variantId?: string;
    quantity: number;
    price: number;
  }>
) {
  try {
    if (!userId || !guestItems.length) {
      return { success: true, mergedCount: 0 };
    }

    let mergedCount = 0;

    for (const item of guestItems) {
      // Bundle rows merge through the server bundle path (price recomputed).
      if (item.bundleId) {
        try {
          await addBundleToCartServer(userId, null, item.bundleId, item.quantity);
          mergedCount++;
        } catch (err) {
          console.error('Failed to merge bundle cart item:', err);
        }
        continue;
      }

      // Product rows
      const { data: existing } = await supabaseAdmin
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', item.productId)
        .eq('variant_id', item.variantId || null)
        .single();

      if (existing) {
        // Increment quantity
        const { error } = await supabaseAdmin
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);

        if (error) {
          console.error('Failed to merge cart item:', error);
        } else {
          mergedCount++;
        }
      } else {
        // Insert new item
        const { error } = await supabaseAdmin
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
            price: item.price,
          });

        if (error) {
          console.error('Failed to insert merged cart item:', error);
        } else {
          mergedCount++;
        }
      }
    }

    return { success: true, mergedCount };
  } catch (error) {
    console.error('Cart merge failed:', error);
    // Don't throw — cart merge failure shouldn't block login
    return { success: false, mergedCount: 0 };
  }
}

// ===================================================================
// CLEAR CART
// ===================================================================

export async function clearCartAction(userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new AppError('CART_CLEAR_FAILED', error.message, 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('CLEAR_CART_ERROR', 'Failed to clear cart', 500);
  }
}
