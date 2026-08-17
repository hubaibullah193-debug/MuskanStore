/**
 * POST /api/payment/verify
 * Verify payment from external webhooks (JazzCash/Easypaisa)
 * Called by payment gateways to confirm payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { recordPaymentAttempt, logAuditEvent } from '@/lib/supabase/helpers';
import { sendPaymentStatusEmail } from '@/server/actions/email';
import { finalizeInventory, releaseInventoryReservations } from '@/lib/payments/inventory-finalization';
import { AppError, getErrorMessage } from '@/lib/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentStatus, transactionId, gateway, amount } = body;

    if (!orderId || !paymentStatus || !gateway) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, paymentStatus, gateway' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, payment_reference, guest_email, user_id, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const isPaymentSuccess = paymentStatus === 'completed' || paymentStatus === 'success';

    // SECURITY: Verify amount matches order total (prevent partial payment acceptance)
    if (amount && Math.abs(amount - order.total_amount) > 0.01) {
      console.error(
        `Payment verify: Amount mismatch for order ${orderId}. Expected: ${order.total_amount}, Got: ${amount}`
      );
      await logAuditEvent(
        'payment_amount_mismatch',
        'order',
        orderId,
        {
          gateway,
          expectedAmount: order.total_amount,
          receivedAmount: amount,
          transactionId,
        }
      );
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // SECURITY: Prevent duplicate webhook processing (idempotency check)
    if (isPaymentSuccess && order.payment_status === 'paid' && order.payment_reference === transactionId) {
      console.log(`Payment verify: Duplicate webhook for order ${orderId}, already paid`);
      return NextResponse.json({ success: true, orderId, status: 'paid' }, { status: 200 });
    }

    // Record payment attempt
    await recordPaymentAttempt(
      orderId,
      paymentStatus,
      isPaymentSuccess ? undefined : 'Payment verification received',
      !isPaymentSuccess
    );

    if (isPaymentSuccess) {
      // Update order to paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          payment_reference: transactionId,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order payment status:', updateError);
      }

      // Log audit event
      await logAuditEvent(
        'payment_verified',
        'order',
        orderId,
        {
          gateway,
          transactionId,
          amount,
          status: 'success',
        }
      );

      // Finalize inventory: convert reservations to permanent stock reduction
      try {
        await finalizeInventory(orderId);
      } catch (error) {
        console.error(`Failed to finalize inventory for order ${orderId}:`, error);
        await logAuditEvent(
          'inventory_finalization_failed',
          'order',
          orderId,
          { gateway, transactionId, error: String(error) }
        );
      }

      // Send payment confirmation email
      let customerEmail = order.guest_email;
      if (order.user_id && !customerEmail) {
        const { data } = await supabase.auth.admin.getUserById(order.user_id);
        customerEmail = data?.user?.email;
      }

      if (customerEmail) {
        await sendPaymentStatusEmail({
          orderNumber: order.order_number,
          customerEmail,
          status: 'completed',
          paymentMethod: gateway,
          totalAmount: order.total_amount,
        }).catch((error) => {
          console.error('Failed to send payment confirmation email:', error);
        });
      }

      console.log(`Payment verified for order ${orderId}`);
    } else {
      // Payment failed
      await logAuditEvent(
        'payment_failed_verification',
        'order',
        orderId,
        {
          gateway,
          transactionId,
          status: 'failed',
        }
      );

      // Release inventory reservations since payment failed
      await releaseInventoryReservations(orderId).catch((error) => {
        console.error(`Failed to release inventory for order ${orderId}:`, error);
      });

      // Send payment failure email
      let customerEmail = order.guest_email;
      if (order.user_id && !customerEmail) {
        const { data } = await supabase.auth.admin.getUserById(order.user_id);
        customerEmail = data?.user?.email;
      }

      if (customerEmail) {
        await sendPaymentStatusEmail({
          orderNumber: order.order_number,
          customerEmail,
          status: 'failed',
          paymentMethod: gateway,
          totalAmount: order.total_amount,
        }).catch((error) => {
          console.error('Failed to send payment failure email:', error);
        });
      }

      console.log(`Payment failed for order ${orderId}`);
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        status: isPaymentSuccess ? 'paid' : 'failed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
