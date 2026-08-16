/**
 * POST /api/cart/add
 * Add item to cart (guest or authenticated)
 * Request body: { productId, variantId?, quantity, guestEmail? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCart, addToCart } from '@/server/actions/cart';
import { AppError, getErrorMessage } from '@/lib/utils/helpers';

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

    // Get or create cart (guest cart for now)
    const cart = await getOrCreateCart(undefined, guestEmail || 'guest@temp.local');

    if (!cart || !cart.id) {
      return NextResponse.json(
        { error: 'Failed to get or create cart' },
        { status: 500 }
      );
    }

    // Add item to cart
    const updatedCart = await addToCart(
      cart.id,
      productId,
      variantId,
      quantity,
      undefined,
      guestEmail
    );

    return NextResponse.json(
      {
        success: true,
        cartId: updatedCart.id,
        items: updatedCart.items,
        itemCount: Array.isArray(updatedCart.items) ? updatedCart.items.length : 0,
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
