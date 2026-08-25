// server/actions/email.ts
// Email integration for orders, payments, and refunds.
//
// P1: every send now routes through `logAndSendEmail` (lib/email/delivery.ts),
// which records delivery in `email_logs`, enforces idempotency, and schedules
// retries. This is the single production email path.

'use server';

import { logAndSendEmail } from '@/lib/email/delivery';
import { supabaseAdmin } from '@/lib/supabase/client';
import {
  orderConfirmationTemplate,
  paymentStatusTemplate,
  refundEmailTemplate,
  refundAdminNotificationTemplate,
  shipmentStatusTemplate,
} from '@/lib/email/templates';

interface OrderConfirmationPayload {
  orderId?: string;
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
  orderId?: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  totalAmount: number;
  paymentReference?: string;
}

interface RefundPayload {
  orderId?: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  refundAmount: number;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
}

interface ShipmentStatusPayload {
  orderId?: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  notes?: string;
}

/**
 * Send order confirmation email.
 * Idempotent per order (duplicate order-creation events won't resend).
 */
export async function sendOrderConfirmation(
  payload: OrderConfirmationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = orderConfirmationTemplate(payload);
    return await logAndSendEmail({
      to: payload.customerEmail,
      subject: `Order Confirmed - #${payload.orderNumber}`,
      html,
      emailType: 'order_confirmation',
      referenceId: payload.orderId ?? null,
      referenceType: payload.orderId ? 'order' : null,
      idempotencyKey: payload.orderId
        ? `order:${payload.orderId}:confirmation`
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending order confirmation:', message);
    return { success: false, error: message };
  }
}

/**
 * Send payment status update email.
 * Deduplicated at the webhook layer (shouldSendWebhookEmail); no extra
 * idempotency key is needed here.
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
    return await logAndSendEmail({
      to: payload.customerEmail,
      subject: `${statusLabel[payload.status]} - Order #${payload.orderNumber}`,
      html,
      emailType: 'payment_status',
      referenceId: payload.orderId ?? null,
      referenceType: payload.orderId ? 'order' : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending payment status email:', message);
    return { success: false, error: message };
  }
}

/**
 * Send refund status email.
 * Idempotent per (order, status) transition.
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
    return await logAndSendEmail({
      to: payload.customerEmail,
      subject: `${statusLabel[payload.status]} - Order #${payload.orderNumber}`,
      html,
      emailType: 'refund',
      referenceId: payload.orderId ?? null,
      referenceType: payload.orderId ? 'order' : null,
      idempotencyKey: payload.orderId
        ? `refund:${payload.orderId}:${payload.status}`
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending refund email:', message);
    return { success: false, error: message };
  }
}

/**
 * Send an internal admin notification when a customer requests a refund.
 * Uses the unified email delivery path (idempotent per order request).
 * The recipient is resolved from the configured support email (settings),
 * falling back to ADMIN_NOTIFY_EMAIL / EMAIL_FROM.
 */
export async function sendRefundAdminNotification(
  payload: {
    orderId?: string;
    orderNumber: string;
    customerEmail: string;
    refundAmount: number;
    reason: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const recipient = await resolveAdminNotifyEmail();
    if (!recipient) {
      console.warn('Refund admin notification skipped: no recipient configured');
      return { success: false, error: 'No admin recipient configured' };
    }

    const html = refundAdminNotificationTemplate(payload);
    return await logAndSendEmail({
      to: recipient,
      subject: `Refund requested - Order #${payload.orderNumber}`,
      html,
      emailType: 'refund_admin_notify',
      referenceId: payload.orderId ?? null,
      referenceType: payload.orderId ? 'order' : null,
      idempotencyKey: payload.orderId ? `refund_admin:${payload.orderId}:requested` : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending refund admin notification:', message);
    return { success: false, error: message };
  }
}

/**
 * Resolve the recipient for internal admin notifications.
 * Order: settings.support_email -> env.ADMIN_NOTIFY_EMAIL -> env.EMAIL_FROM.
 */
async function resolveAdminNotifyEmail(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'support_email')
      .single();
    const fromSettings = (data?.value as string) || null;
    if (fromSettings) return fromSettings;
  } catch {
    // settings table may be empty; fall through to env
  }
  return process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM || null;
}

/**
 * Send shipment status update email.
 * Idempotent per (order, status) transition.
 */
export async function sendShipmentStatusEmail(
  payload: ShipmentStatusPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusLabel = {
      pending: 'Shipment Pending',
      shipped: 'Your Order Has Shipped',
      delivered: 'Delivery Confirmed',
      cancelled: 'Shipment Cancelled',
      returned: 'Return Initiated',
    };

    const html = shipmentStatusTemplate(payload);
    return await logAndSendEmail({
      to: payload.customerEmail,
      subject: `${statusLabel[payload.status]} - Order #${payload.orderNumber}`,
      html,
      emailType: 'shipment_status',
      referenceId: payload.orderId ?? null,
      referenceType: payload.orderId ? 'order' : null,
      idempotencyKey: payload.orderId
        ? `shipment:${payload.orderId}:${payload.status}`
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending shipment status email:', message);
    return { success: false, error: message };
  }
}
