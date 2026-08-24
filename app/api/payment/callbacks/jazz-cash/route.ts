/**
 * GET /api/payment/callbacks/jazz-cash
 * Callback endpoint for JazzCash payment gateway
 * Customer is redirected here after payment attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { recordPaymentAttempt, logAuditEvent } from '@/lib/supabase/helpers';
import { verifyJazzCashWebhookSignature, verifyReturnUrl } from '@/lib/payments/signature';
import { sendPaymentStatusEmail } from '@/server/actions/email';
import { finalizeInventory, releaseInventoryReservations } from '@/lib/payments/inventory-finalization';
import { shouldSendWebhookEmail } from '@/lib/email/webhook-dedup';

export const dynamic = 'force-dynamic';

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

    // SECURITY: Fail-closed verification of the return URL we generated.
    // A valid HMAC over (orderId, method, ts) is required even when the gateway
    // secret is absent, so an attacker cannot forge a "payment succeeded" redirect.
    const returnUrlSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const returnSig = searchParams.get('sig');
    const returnTs = searchParams.get('ts');
    if (
      !returnUrlSecret ||
      !verifyReturnUrl(orderId, 'jazz_cash', returnSig, returnTs, returnUrlSecret)
    ) {
      console.error('JazzCash return URL signature missing or invalid for order:', orderId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/payment-error?reason=invalid_signature`
      );
    }

    // SECURITY: If the gateway secret is configured, also require the gateway's
    // own signature. Fail closed - a misconfigured gateway must never be trusted.
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

      // Finalize inventory: convert reservations to permanent stock reduction
      try {
        await finalizeInventory(orderId);
      } catch (error) {
        console.error(`Failed to finalize inventory for order ${orderId}:`, error);
      }

      // Send payment status email - deduplicated to prevent duplicate emails from webhook retries
      if (updatedOrder) {
        let customerEmail = updatedOrder.guest_email;
        if (updatedOrder.user_id && !customerEmail) {
          const { data } = await supabase.auth.admin.getUserById(updatedOrder.user_id);
          customerEmail = data?.user?.email;
        }

        if (customerEmail) {
          // Check if email already sent for this exact webhook payload
          const shouldSend = await shouldSendWebhookEmail({
            orderId,
            transactionId: transactionId || '',
            paymentGateway: 'jazz_cash',
            emailType: 'payment_status',
            webhookPayload: Object.fromEntries(searchParams),
          });

          if (shouldSend) {
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

      // Release inventory reservations since payment failed
      await releaseInventoryReservations(orderId).catch((error) => {
        console.error(`Failed to release inventory for order ${orderId}:`, error);
      });

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
