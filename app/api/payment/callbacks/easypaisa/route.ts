/**
 * GET /api/payment/callbacks/easypaisa
 * Callback endpoint for Easypaisa payment gateway
 * Customer is redirected here after payment attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { recordPaymentAttempt, logAuditEvent } from '@/lib/supabase/helpers';
import { verifyEasypaisaWebhookSignature } from '@/lib/payments/signature';
import { sendPaymentStatusEmail } from '@/server/actions/email';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('transactionID');
    const status = searchParams.get('status');
    const transactionId = searchParams.get('transactionID');

    if (!orderId || !status) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=missing_params`
      );
    }

    // Verify webhook signature if secret is available
    const secret = process.env.EASYPAISA_SECRET;
    if (secret) {
      const webhookData = Object.fromEntries(searchParams);
      const isValidSignature = verifyEasypaisaWebhookSignature(secret, webhookData);

      if (!isValidSignature) {
        console.error('Easypaisa callback signature verification failed for order:', orderId);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=invalid_signature`
        );
      }
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_status, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=order_not_found`
      );
    }

    // Determine if payment was successful
    const paymentSuccessful = status === 'success' || status === 'completed';
    const isCountedFailure = !paymentSuccessful;

    // Record payment attempt
    await recordPaymentAttempt(
      orderId,
      status,
      paymentSuccessful ? undefined : searchParams.get('errorDescription') || 'Payment declined',
      isCountedFailure
    );

    if (paymentSuccessful) {
      // Update order status
      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({
          order_status: 'confirmed',
          payment_status: 'paid',
        })
        .eq('id', orderId)
        .select()
        .single();

      // Log success
      await logAuditEvent(
        'payment_confirmed_easypaisa',
        'order',
        orderId,
        {
          transactionId,
          status,
        }
      );

      // Send payment status email
      if (updatedOrder) {
        const customerEmail = updatedOrder.guest_email || updatedOrder.user_email;
        if (customerEmail) {
          await sendPaymentStatusEmail({
            orderNumber: updatedOrder.order_number,
            customerEmail,
            status: 'completed',
            paymentMethod: 'Easypaisa',
            totalAmount: updatedOrder.total_amount,
            paymentReference: transactionId || undefined,
          }).catch((error) => {
            console.error('Failed to send payment status email:', error);
            // Don't throw - payment succeeded even if email fails
          });
        }
      }

      // Redirect to success page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmation/${orderId}?payment=success`
      );
    } else {
      // Log failure
      await logAuditEvent(
        'payment_failed_easypaisa',
        'order',
        orderId,
        {
          status,
          reason: searchParams.get('errorDescription'),
        }
      );

      // Redirect to retry page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmation/${orderId}?payment=failed`
      );
    }
  } catch (error) {
    console.error('Easypaisa callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=server_error`
    );
  }
}
