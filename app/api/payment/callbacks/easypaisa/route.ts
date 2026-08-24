/**
 * GET /api/payment/callbacks/easypaisa
 * Browser return endpoint for Easypaisa.
 *
 * NON-AUTHORITATIVE / status-display only. The server-to-server webhook
 * (/api/webhooks/easypaisa) is the authoritative payment confirmation. This
 * handler only verifies the redirect originated from us (return-URL signature)
 * and optionally the gateway signature, then redirects the customer to the
 * correct status page based on the CURRENT order state. It never marks an order
 * paid, finalizes inventory, or sends email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { verifyEasypaisaWebhookSignature, verifyReturnUrl } from '@/lib/payments/signature';
import { logAuditEvent } from '@/lib/supabase/helpers';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('transactionID');
    const status = searchParams.get('status');

    if (!orderId || !status) {
      return NextResponse.redirect(`${SITE_URL}/payment-error?reason=missing_params`);
    }

    // SECURITY: Fail-closed verification of the return URL we generated.
    const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const returnSig = searchParams.get('sig');
    const returnTs = searchParams.get('ts');
    if (
      !returnUrlSecret ||
      !verifyReturnUrl(orderId, 'easypaisa', returnSig, returnTs, returnUrlSecret)
    ) {
      console.error('Easypaisa return URL signature missing or invalid for order:', orderId);
      return NextResponse.redirect(`${SITE_URL}/payment-error?reason=invalid_signature`);
    }

    // SECURITY: If the secret is configured, also require the gateway's own
    // signature. Fail closed - a misconfigured gateway must never be trusted.
    const secret = process.env.EASYPAISA_SECRET;
    if (secret) {
      const webhookData = Object.fromEntries(searchParams);
      if (!verifyEasypaisaWebhookSignature(secret, webhookData)) {
        console.error('Easypaisa callback signature verification failed for order:', orderId);
        return NextResponse.redirect(`${SITE_URL}/payment-error?reason=invalid_signature`);
      }
    }

    // Fetch CURRENT order state (the webhook is the source of truth).
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_status, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.redirect(`${SITE_URL}/payment-error?reason=order_not_found`);
    }

    await logAuditEvent('payment_callback_received', 'order', orderId, {
      gateway: 'easypaisa',
      status,
    }).catch(() => {});

    const gatewaySuccess = status === 'success' || status === 'completed';
    const alreadyPaid =
      order.payment_status === 'paid' && order.order_status === 'confirmed';

    if (alreadyPaid || gatewaySuccess) {
      return NextResponse.redirect(`${SITE_URL}/order-confirmation/${orderId}?payment=success`);
    }
    return NextResponse.redirect(`${SITE_URL}/order-confirmation/${orderId}?payment=failed`);
  } catch (error) {
    console.error('Easypaisa callback error:', error);
    return NextResponse.redirect(`${SITE_URL}/payment-error?reason=server_error`);
  }
}
