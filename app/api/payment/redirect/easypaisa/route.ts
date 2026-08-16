/**
 * POST /api/payment/redirect/easypaisa
 * Redirect customer to Easypaisa payment gateway
 * Called from order confirmation page with order ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateEasypaisaUrl } from '@/lib/payments/url-generators';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      );
    }

    // Fetch order to get amount and customer email
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, guest_email, user_id, order_status, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order is in pending_payment status
    if (order.order_status !== 'pending_payment' || order.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not eligible for payment' },
        { status: 400 }
      );
    }

    // Get customer email
    let customerEmail = order.guest_email;
    if (order.user_id && !customerEmail) {
      const { data } = await supabase.auth.admin.getUserById(order.user_id);
      customerEmail = data?.user?.email;
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      );
    }

    // Generate payment URL with HMAC signature
    const paymentUrl = generateEasypaisaUrl(
      orderId,
      order.total_amount,
      customerEmail
    );

    // Return redirect URL
    return NextResponse.json(
      { redirectUrl: paymentUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error('Easypaisa redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment redirect' },
      { status: 500 }
    );
  }
}
