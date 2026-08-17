'use server';

/**
 * Cart Server Actions
 * Manage shopping cart - move from localStorage to Supabase
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { AppError } from '@/lib/utils/helpers';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
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
      .select('id, product_id, variant_id, quantity, price')
      .eq('user_id', userId);

    if (error) {
      throw new AppError('CART_FETCH_FAILED', error.message, 500);
    }

    return (data || []).map(item => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      quantity: item.quantity,
      price: item.price,
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
