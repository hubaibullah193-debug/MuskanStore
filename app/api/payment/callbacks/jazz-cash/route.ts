/**
 * GET /api/payment/callbacks/jazz-cash
 * Callback endpoint for JazzCash payment gateway
 * Customer is redirected here after payment attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { recordPaymentAttempt, logAuditEvent } from '@/lib/supabase/helpers';
import { verifyJazzCashWebhookSignature } from '@/lib/payments/signature';
import { sendPaymentStatusEmail } from '@/server/actions/email';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('pp_TxnRefNo');
    const responseCode = searchParams.get('pp_ResponseCode');
    const transactionId = searchParams.get('pp_TransactionID');

    if (!orderId || !responseCode) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=missing_params`
      );
    }

    // Verify webhook signature if password is available
    const password = process.env.JAZZ_CASH_PP_PASSWORD;
    if (password) {
      const webhookData = Object.fromEntries(searchParams);
      const isValidSignature = verifyJazzCashWebhookSignature(password, webhookData);

      if (!isValidSignature) {
        console.error('JazzCash callback signature verification failed for order:', orderId);
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
    const paymentSuccessful = responseCode === '000';
    const isCountedFailure = !paymentSuccessful;

    // Record payment attempt
    await recordPaymentAttempt(
      orderId,
      responseCode,
      paymentSuccessful ? undefined : searchParams.get('pp_ResponseDesc') || 'Payment declined',
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
        'payment_confirmed_jazzcash',
        'order',
        orderId,
        {
          transactionId,
          responseCode,
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
            paymentMethod: 'JazzCash',
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
        'payment_failed_jazzcash',
        'order',
        orderId,
        {
          responseCode,
          reason: searchParams.get('pp_ResponseDesc'),
        }
      );

      // Redirect to retry page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmation/${orderId}?payment=failed`
      );
    }
  } catch (error) {
    console.error('JazzCash callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=server_error`
    );
  }
}
