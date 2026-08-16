// app/actions/send-email.ts
// Server Action for sending emails with logging and audit trail

'use server';

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/service';
import { orderConfirmationTemplate, paymentStatusTemplate } from '@/lib/email/templates';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SendOrderConfirmationEmailParams {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  tax: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress?: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface SendPaymentStatusEmailParams {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  totalAmount: number;
  paymentReference?: string;
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = orderConfirmationTemplate({
      orderNumber: params.orderNumber,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      items: params.items,
      subtotal: params.subtotal,
      tax: params.tax,
      shippingFee: params.shippingFee,
      totalAmount: params.totalAmount,
      shippingAddress: params.shippingAddress,
    });

    const result = await sendEmail({
      to: params.customerEmail,
      subject: `Order Confirmation #${params.orderNumber}`,
      html,
    });

    if (!result.success) {
      // Log failed email
      await supabaseServiceRole.from('email_logs').insert({
        recipient_email: params.customerEmail,
        subject: `Order Confirmation #${params.orderNumber}`,
        email_type: 'order_confirmation',
        status: 'failed',
        reference_id: params.orderId,
        reference_type: 'order',
        error_message: result.error,
      });

      return { success: false, error: result.error };
    }

    // Log successful email
    await supabaseServiceRole.from('email_logs').insert({
      recipient_email: params.customerEmail,
      subject: `Order Confirmation #${params.orderNumber}`,
      email_type: 'order_confirmation',
      status: 'sent',
      reference_id: params.orderId,
      reference_type: 'order',
      message_id: result.messageId,
      sent_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send order confirmation email:', errorMessage);

    // Log error
    await supabaseServiceRole.from('email_logs').insert({
      recipient_email: params.customerEmail,
      subject: `Order Confirmation #${params.orderNumber}`,
      email_type: 'order_confirmation',
      status: 'failed',
      reference_id: params.orderId,
      reference_type: 'order',
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Send payment status email
 */
export async function sendPaymentStatusEmail(
  params: SendPaymentStatusEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusLabels = {
      pending: 'Processing',
      completed: 'Confirmed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };

    const html = paymentStatusTemplate({
      orderNumber: params.orderNumber,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      status: params.status,
      paymentMethod: params.paymentMethod,
      totalAmount: params.totalAmount,
      paymentReference: params.paymentReference,
    });

    const result = await sendEmail({
      to: params.customerEmail,
      subject: `Payment ${statusLabels[params.status]} - Order #${params.orderNumber}`,
      html,
    });

    if (!result.success) {
      await supabaseServiceRole.from('email_logs').insert({
        recipient_email: params.customerEmail,
        subject: `Payment ${statusLabels[params.status]} - Order #${params.orderNumber}`,
        email_type: 'payment_status',
        status: 'failed',
        reference_id: params.orderId,
        reference_type: 'order',
        error_message: result.error,
      });

      return { success: false, error: result.error };
    }

    await supabaseServiceRole.from('email_logs').insert({
      recipient_email: params.customerEmail,
      subject: `Payment ${statusLabels[params.status]} - Order #${params.orderNumber}`,
      email_type: 'payment_status',
      status: 'sent',
      reference_id: params.orderId,
      reference_type: 'order',
      message_id: result.messageId,
      sent_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send payment status email:', errorMessage);

    await supabaseServiceRole.from('email_logs').insert({
      recipient_email: params.customerEmail,
      subject: `Payment Status - Order #${params.orderNumber}`,
      email_type: 'payment_status',
      status: 'failed',
      reference_id: params.orderId,
      reference_type: 'order',
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}
