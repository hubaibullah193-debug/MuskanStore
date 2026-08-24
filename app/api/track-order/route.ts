/**
 * POST /api/track-order
 * Find order by guest email and token
 * Used for guest order tracking without authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and tracking code required' },
        { status: 400 }
      );
    }

    // Find order by guest email and token (service role bypasses RLS so a
    // guest can look up their own order via the tracking token)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, guest_email, guest_token, guest_token_expires_at')
      .eq('guest_email', email)
      .eq('guest_token', token)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found. Check your email and tracking code.' },
        { status: 404 }
      );
    }

    // Verify token hasn't expired
    if (order.guest_token_expires_at) {
      const expiresAt = new Date(order.guest_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Tracking code has expired' },
          { status: 410 }
        );
      }
    }

    return NextResponse.json(
      {
        orderId: order.id,
        orderNumber: order.order_number,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json(
      { error: 'Failed to track order' },
      { status: 500 }
    );
  }
}
