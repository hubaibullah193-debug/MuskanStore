// lib/email/templates.ts
// Email HTML templates for order confirmations, payment status, and refunds

interface OrderEmailData {
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

interface PaymentStatusEmailData {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  totalAmount: number;
  paymentReference?: string;
}

interface RefundEmailData {
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  refundAmount: number;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
}

/**
 * Order confirmation email template
 */
export function orderConfirmationTemplate(data: OrderEmailData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.lineTotal.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const shippingSection = data.shippingAddress
    ? `
    <h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">Shipping Address</h3>
    <p style="margin: 0; color: #666; font-size: 14px;">
      ${data.shippingAddress.fullName}<br>
      ${data.shippingAddress.street}<br>
      ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
      ${data.shippingAddress.country}
    </p>
  `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; color: #333; font-size: 24px; }
    .header p { margin: 4px 0 0 0; color: #666; font-size: 14px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { text-align: left; padding: 12px; background: #f8f9fa; border-bottom: 2px solid #ddd; font-weight: 600; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .summary-row.total { font-weight: 600; font-size: 18px; border-top: 2px solid #ddd; padding-top: 12px; margin-top: 12px; }
    .footer { color: #999; font-size: 12px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmed</h1>
      <p>Order #${data.orderNumber}</p>
    </div>

    <p>Thank you for your order${data.customerName ? ', ' + data.customerName : ''}!</p>
    <p>We've received your order and will process it shortly. Here's a summary of what you ordered:</p>

    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>Rs. ${data.subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Tax</span>
        <span>Rs. ${data.tax.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Shipping</span>
        <span>Rs. ${data.shippingFee.toFixed(2)}</span>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <span>Rs. ${data.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    ${shippingSection}

    <p style="margin-top: 24px; color: #666; font-size: 14px;">
      You'll receive another email once your order ships. If you have any questions, please reply to this email.
    </p>

    <div class="footer">
      <p>© 2026 mstore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Payment status update email template
 */
export function paymentStatusTemplate(data: PaymentStatusEmailData): string {
  const statusMessages = {
    pending: {
      title: 'Payment Processing',
      message: 'Your payment is being processed. You will receive an update once it is confirmed.',
      color: '#f59e0b',
    },
    completed: {
      title: 'Payment Confirmed',
      message: 'Your payment has been successfully received. Your order will be prepared for shipment shortly.',
      color: '#10b981',
    },
    failed: {
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again or use a different payment method.',
      color: '#ef4444',
    },
    cancelled: {
      title: 'Payment Cancelled',
      message: 'The payment has been cancelled. Your order has not been processed.',
      color: '#6b7280',
    },
  };

  const statusInfo = statusMessages[data.status];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #f0fdf4; border-left: 4px solid ${statusInfo.color}; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .alert h2 { margin: 0 0 8px 0; color: ${statusInfo.color}; font-size: 18px; }
    .alert p { margin: 0; color: #333; }
    .details { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: 600; }
    .footer { color: #999; font-size: 12px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>${statusInfo.title}</h2>
      <p>${statusInfo.message}</p>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="label">Order Number</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      <div class="detail-row">
        <span class="label">Amount</span>
        <span class="value">Rs. ${data.totalAmount.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="label">Payment Method</span>
        <span class="value">${data.paymentMethod}</span>
      </div>
      ${data.paymentReference ? `<div class="detail-row"><span class="label">Reference</span><span class="value">${data.paymentReference}</span></div>` : ''}
    </div>

    <p style="margin-top: 24px; color: #666; font-size: 14px;">
      If you have any questions or concerns about this transaction, please contact our support team.
    </p>

    <div class="footer">
      <p>© 2026 mstore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Refund status email template
 */
export function refundEmailTemplate(data: RefundEmailData): string {
  const statusMessages = {
    requested: {
      title: 'Refund Requested',
      message: 'Your refund request has been received and is under review.',
      color: '#f59e0b',
    },
    approved: {
      title: 'Refund Approved',
      message: 'Your refund has been approved and will be processed within 3-5 business days.',
      color: '#10b981',
    },
    rejected: {
      title: 'Refund Rejected',
      message: 'Unfortunately, your refund request could not be approved. Please contact us for more details.',
      color: '#ef4444',
    },
    completed: {
      title: 'Refund Completed',
      message: 'Your refund has been completed and credited back to your original payment method.',
      color: '#10b981',
    },
  };

  const statusInfo = statusMessages[data.status];
  const reasonSection = data.reason
    ? `
    <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 16px 0;">
      <p style="margin: 0; color: #666; font-size: 14px;"><strong>Reason:</strong> ${data.reason}</p>
    </div>
  `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #f0fdf4; border-left: 4px solid ${statusInfo.color}; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .alert h2 { margin: 0 0 8px 0; color: ${statusInfo.color}; font-size: 18px; }
    .alert p { margin: 0; color: #333; }
    .details { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: 600; }
    .footer { color: #999; font-size: 12px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>${statusInfo.title}</h2>
      <p>${statusInfo.message}</p>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="label">Order Number</span>
        <span class="value">${data.orderNumber}</span>
      </div>
      <div class="detail-row">
        <span class="label">Refund Amount</span>
        <span class="value">Rs. ${data.refundAmount.toFixed(2)}</span>
      </div>
    </div>

    ${reasonSection}

    <p style="margin-top: 24px; color: #666; font-size: 14px;">
      If you have any questions or need further assistance, please don't hesitate to reach out to our support team.
    </p>

    <div class="footer">
      <p>© 2026 mstore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
