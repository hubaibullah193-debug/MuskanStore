// server/actions/email.ts
// Email integration for orders, payments, and refunds

'use server';

import { sendEmail } from '@/lib/email/service';
import {
  orderConfirmationTemplate,
  paymentStatusTemplate,
  refundEmailTemplate,
} from '@/lib/email/templates';

interface OrderConfirmationPayload {
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

interface PaymentStatusPayload {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  totalAmount: number;
  paymentReference?: string;
}

interface RefundPayload {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  refundAmount: number;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
}

/**
 * Send order confirmation email
 * Called after successful order creation
 */
export async function sendOrderConfirmation(
  payload: OrderConfirmationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = orderConfirmationTemplate(payload);
    const result = await sendEmail({
      to: payload.customerEmail,
      subject: `Order Confirmed - #${payload.orderNumber}`,
      html,
    });

    if (!result.success) {
      console.error('Failed to send order confirmation:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending order confirmation:', message);
    return { success: false, error: message };
  }
}

/**
 * Send payment status update email
 * Called after payment status changes
 */
export async function sendPaymentStatusEmail(
  payload: PaymentStatusPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusLabel = {
      pending: 'Payment Processing',
      completed: 'Payment Confirmed',
      failed: 'Payment Failed',
      cancelled: 'Payment Cancelled',
    };

    const html = paymentStatusTemplate(payload);
    const result = await sendEmail({
      to: payload.customerEmail,
      subject: `${statusLabel[payload.status]} - Order #${payload.orderNumber}`,
      html,
    });

    if (!result.success) {
      console.error('Failed to send payment status email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending payment status email:', message);
    return { success: false, error: message };
  }
}

/**
 * Send refund status email
 * Called after refund request, approval, rejection, or completion
 */
export async function sendRefundEmail(
  payload: RefundPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusLabel = {
      requested: 'Refund Requested',
      approved: 'Refund Approved',
      rejected: 'Refund Rejected',
      completed: 'Refund Completed',
    };

    const html = refundEmailTemplate(payload);
    const result = await sendEmail({
      to: payload.customerEmail,
      subject: `${statusLabel[payload.status]} - Order #${payload.orderNumber}`,
      html,
    });

    if (!result.success) {
      console.error('Failed to send refund email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending refund email:', message);
    return { success: false, error: message };
  }
}
