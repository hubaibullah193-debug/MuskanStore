/**
 * POST /api/checkout
 * Create order from cart and redirect to payment/confirmation
 * Handles both authenticated and guest checkouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOrder, reserveInventory } from '@/server/actions/orders';
import { validateCartInventory } from '@/server/actions/cart';
import { generateJazzCashUrl, generateEasypaisaUrl } from '@/lib/payments/url-generators';
import { AppError, getErrorMessage } from '@/lib/utils/helpers';
import { supabase } from '@/lib/supabase/client';

const TAX_RATE = 0.17; // 17% tax
const DELIVERY_FEE = 300; // Rs. 300 delivery fee
const PAYMENT_FEE = 0; // Can be dynamic based on payment method

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      deliveryAddress,
      paymentMethod,
      guestEmail,
    } = body;

    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city) {
      return NextResponse.json(
        { error: 'Delivery address required' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !['cod', 'jazz_cash', 'easypaisa'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    const userEmail = user?.email || guestEmail;

    // Validate email
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    // Validate inventory before reserving
    await validateCartInventory(items);

    // Reserve inventory (optional but recommended)
    await reserveInventory(items);

    // Create order
    const order = await createOrder(
      userId,
      userEmail,
      items,
      deliveryAddress,
      paymentMethod,
      TAX_RATE,
      DELIVERY_FEE,
      PAYMENT_FEE
    );

    if (!order || !order.id) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    let redirectUrl: string;
    let paymentUrl: string | null = null;

    if (paymentMethod === 'cod') {
      // Cash on Delivery - redirect to confirmation
      redirectUrl = `/order-confirmation/${order.id}`;
    } else if (paymentMethod === 'jazz_cash') {
      // Generate JazzCash payment URL
      paymentUrl = generateJazzCashUrl(
        order.id,
        order.total_amount,
        userEmail
      );
      redirectUrl = `/order-confirmation/${order.id}?paymentUrl=${encodeURIComponent(paymentUrl)}`;
    } else if (paymentMethod === 'easypaisa') {
      // Generate Easypaisa payment URL
      paymentUrl = generateEasypaisaUrl(
        order.id,
        order.total_amount,
        userEmail
      );
      redirectUrl = `/order-confirmation/${order.id}?paymentUrl=${encodeURIComponent(paymentUrl)}`;
    } else {
      redirectUrl = `/order-confirmation/${order.id}`;
    }

    // For guest checkout, append token to allow order tracking
    const guestToken = order.guest_token;
    if (guestToken) {
      redirectUrl += `${redirectUrl.includes('?') ? '&' : '?'}token=${guestToken}`;
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        redirectUrl,
        paymentUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Checkout error:', error);

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

