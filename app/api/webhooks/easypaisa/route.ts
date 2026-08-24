/**
 * Easypaisa Payment Webhook Handler (server-to-server IPN)
 * Receives async payment confirmation from Easypaisa.
 * This is the AUTHORITATIVE payment confirmation: it verifies the gateway
 * signature and amount, then marks the order paid, finalizes inventory, and
 * sends the confirmation email. The browser return callback is non-authoritative.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { recordPaymentAttempt, logAuditEvent } from '@/lib/supabase/helpers';
import { verifyEasypaisaWebhookSignature } from '@/lib/payments/signature';
import {
  recordWebhookProcessing,
  finalizeInventory,
  releaseInventoryReservations,
} from '@/lib/payments/inventory-finalization';
import { sendPaymentStatusEmail } from '@/server/actions/email';
import { shouldSendWebhookEmail } from '@/lib/email/webhook-dedup';

/**
 * Parse a gateway webhook body that may arrive as JSON or as
 * application/x-www-form-urlencoded (Easypaisa posts form-encoded data).
 */
async function parseWebhookBody(request: NextRequest): Promise<Record<string, any>> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, any>;
  }
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseWebhookBody(request);

    // SECURITY: Verify webhook signature using HMAC (NOT just field presence).
    const secret = process.env.EASYPAISA_SECRET || '';
    if (!secret) {
      console.error('Easypaisa webhook: EASYPAISA_SECRET not configured');
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 });
    }

    if (!verifyEasypaisaWebhookSignature(secret, body)) {
      console.error('Easypaisa webhook signature verification failed - rejecting forged webhook');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const orderId = body.transactionID;
    const status = body.status;
    const transactionId = body.transactionID || orderId;
    const amount = body.amount ? parseFloat(body.amount) : 0;

    if (!orderId || !status) {
      console.error('Easypaisa webhook missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, order_status, payment_status, total_amount, payment_reference, guest_email, user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error(`Easypaisa webhook: Order ${orderId} not found`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // SECURITY: Verify amount matches order total (prevent partial payment acceptance)
    if (Math.abs(amount - order.total_amount) > 0.01) {
      console.error(
        `Easypaisa webhook: Amount mismatch for order ${orderId}. Expected: ${order.total_amount}, Got: ${amount}`
      );
      await logAuditEvent('payment_amount_mismatch', 'order', orderId, {
        gateway: 'easypaisa',
        expectedAmount: order.total_amount,
        receivedAmount: amount,
        transactionId,
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // SECURITY: Record webhook processing to detect and handle duplicates
    const webhookRecord = await recordWebhookProcessing(
      orderId,
      transactionId,
      'easypaisa',
      body
    );

    if (webhookRecord.isDuplicate && webhookRecord.wasProcessed) {
      console.log(`Easypaisa webhook: Duplicate webhook for order ${orderId}, already processed`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const paymentSuccessful = status === 'success' || status === 'completed';
    const isCountedFailure = !paymentSuccessful;

    // Record payment attempt (informational / retry gating)
    await recordPaymentAttempt(
      orderId,
      status,
      paymentSuccessful ? undefined : body.errorDescription || 'Payment declined',
      isCountedFailure
    );

    if (paymentSuccessful) {
      // Update order status to confirmed and payment status to paid.
      // ONLY after signature AND amount verification passed.
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          order_status: 'confirmed',
          payment_status: 'paid',
          payment_reference: transactionId,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error(`Easypaisa webhook: Failed to update order ${orderId}`, updateError);
      }

      // Finalize inventory reservations after verified payment.
      try {
        const result = await finalizeInventory(orderId);
        console.log(
          `Easypaisa: Finalized ${result.reservationsFinalized} inventory reservations for order ${orderId}`
        );
      } catch (error) {
        console.error(`Easypaisa: Failed to finalize inventory for order ${orderId}`, error);
        await logAuditEvent('inventory_finalization_failed', 'order', orderId, {
          gateway: 'easypaisa',
          error: String(error),
        });
      }

      // Send (deduplicated) payment confirmation email from the authoritative path.
      await sendPaymentConfirmationEmail({
        orderId,
        orderNumber: order.order_number,
        guestEmail: order.guest_email,
        userId: order.user_id,
        totalAmount: order.total_amount,
        transactionId,
        paymentGateway: 'easypaisa',
        paymentMethod: 'Easypaisa',
        webhookPayload: body,
      });

      await logAuditEvent('payment_confirmed_webhook', 'order', orderId, {
        gateway: 'easypaisa',
        transactionId,
        amount,
        status,
      });

      console.log(`Easypaisa payment confirmed for order ${orderId}`);
    } else {
      // Payment failed - release inventory reservations
      try {
        await releaseInventoryReservations(orderId);
        console.log(`Easypaisa: Released inventory reservations for failed order ${orderId}`);
      } catch (error) {
        console.error(`Easypaisa: Failed to release reservations for order ${orderId}`, error);
      }

      const { data: attempts } = await supabaseAdmin
        .from('payment_attempts')
        .select('attempt_number, is_counted_failure')
        .eq('order_id', orderId)
        .order('attempted_at', { ascending: false })
        .limit(1);

      const failureCount = attempts?.filter((a) => a.is_counted_failure).length || 0;

      await logAuditEvent('payment_failed_webhook', 'order', orderId, {
        gateway: 'easypaisa',
        transactionId,
        status,
        failureReason: body.errorDescription,
        failureCount,
      });

      if (failureCount >= 3) {
        await logAuditEvent('payment_max_failures_reached', 'order', orderId, {
          failureCount: 3,
          gateway: 'easypaisa',
        });
        console.warn(`Easypaisa: Order ${orderId} reached max payment failures`);
      }

      console.log(`Easypaisa payment failed for order ${orderId}: ${body.errorDescription}`);
    }

    // Return 200 OK to acknowledge receipt (gateway stops retrying)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Easypaisa webhook error:', error);
    // Return 500 so gateway retries later
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Resolve the customer email and send a deduplicated payment confirmation email.
 */
async function sendPaymentConfirmationEmail({
  orderId,
  orderNumber,
  guestEmail,
  userId,
  totalAmount,
  transactionId,
  paymentGateway,
  paymentMethod,
  webhookPayload,
}: {
  orderId: string;
  orderNumber: string;
  guestEmail: string | null;
  userId: string | null;
  totalAmount: number;
  transactionId: string;
  paymentGateway: 'jazz_cash' | 'easypaisa';
  paymentMethod: string;
  webhookPayload: Record<string, any>;
}) {
  try {
    let customerEmail = guestEmail;
    if (userId && !customerEmail) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      customerEmail = data?.user?.email ?? null;
    }
    if (!customerEmail) return;

    const shouldSend = await shouldSendWebhookEmail({
      orderId,
      transactionId: transactionId || '',
      paymentGateway,
      emailType: 'payment_status',
      webhookPayload,
    });

    if (!shouldSend) return;

    await sendPaymentStatusEmail({
      orderNumber,
      customerEmail,
      status: 'completed',
      paymentMethod,
      totalAmount,
      paymentReference: transactionId || undefined,
    }).catch((error) => {
      console.error('Failed to send payment status email:', error);
    });
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
  }
}
