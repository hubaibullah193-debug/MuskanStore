/**
 * POST /api/cart/add
 * Add item to cart (guest or authenticated)
 * Request body: { productId, variantId?, quantity, guestEmail? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { addToCart } from '@/server/actions/cart';
import { AppError, getErrorMessage } from '@/lib/utils/helpers';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, variantId, quantity = 1, guestEmail } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID required' },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId && !guestEmail) {
      return NextResponse.json(
        { error: 'Authentication or guest email required' },
        { status: 400 }
      );
    }

    // Add item to cart
    await addToCart(
      userId || '',
      productId,
      variantId,
      quantity,
      guestEmail
    );

    // Fetch updated cart items
    let query = supabase.from('cart_items').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('guest_email', guestEmail).is('user_id', null);
    }

    const { data: cartItems, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        items: cartItems || [],
        itemCount: (cartItems || []).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cart add error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
