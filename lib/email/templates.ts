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

interface ShipmentStatusEmailData {
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
 * Shipment status update email template
 */
export function shipmentStatusTemplate(data: ShipmentStatusEmailData): string {
  const statusMessages = {
    pending: {
      title: 'Shipment Pending',
      message: 'Your order is being prepared for shipment. We will notify you once it ships.',
      color: '#f59e0b',
    },
    shipped: {
      title: 'Your Order Has Shipped!',
      message: 'Great news! Your order is on its way. Use the tracking information below to monitor your delivery.',
      color: '#3b82f6',
    },
    delivered: {
      title: 'Delivery Confirmed',
      message: 'Your order has been delivered. Thank you for shopping with us!',
      color: '#10b981',
    },
    cancelled: {
      title: 'Shipment Cancelled',
      message: 'Your shipment has been cancelled. Please contact us if you have any questions.',
      color: '#ef4444',
    },
    returned: {
      title: 'Return Initiated',
      message: 'Your return has been initiated. We will provide return instructions shortly.',
      color: '#8b5cf6',
    },
  };

  const statusInfo = statusMessages[data.status];
  const trackingSection = data.trackingNumber
    ? `
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #333;">Tracking Information</h3>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
        <span style="color: #666;">Tracking Number</span>
        <span style="font-weight: 600; font-family: monospace;">${data.trackingNumber}</span>
      </div>
      ${data.carrier ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
        <span style="color: #666;">Carrier</span>
        <span style="font-weight: 600;">${data.carrier}</span>
      </div>` : ''}
      ${data.estimatedDelivery ? `<div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span style="color: #666;">Estimated Delivery</span>
        <span style="font-weight: 600;">${new Date(data.estimatedDelivery).toLocaleDateString()}</span>
      </div>` : ''}
    </div>
  `
    : '';

  const notesSection = data.notes
    ? `
    <div style="background: #f3f4f6; padding: 12px; border-radius: 4px; margin: 16px 0; border-left: 4px solid #6b7280;">
      <p style="margin: 0; color: #666; font-size: 14px;"><strong>Note:</strong> ${data.notes}</p>
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
    </div>

    ${trackingSection}
    ${notesSection}

    <p style="margin-top: 24px; color: #666; font-size: 14px;">
      If you have any questions about your shipment, please reply to this email or contact our support team.
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
      <p>&copy; 2026 mstore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Low stock digest email template (admin notification)
 */
interface LowStockDigestData {
  lowStockItems: Array<{
    productName: string;
    sku: string;
    quantity: number;
    threshold: number;
  }>;
  outOfStockItems: Array<{
    productName: string;
    sku: string;
  }>;
}

export function lowStockDigestTemplate(data: LowStockDigestData): string {
  const lowStockRows = data.lowStockItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-family: monospace;">${item.sku}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${item.quantity}</span>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.threshold}</td>
    </tr>`
    )
    .join('');

  const outOfStockRows = data.outOfStockItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-family: monospace;">${item.sku}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600;">0</span>
      </td>
    </tr>`
    )
    .join('');

  const totalAlerts = data.lowStockItems.length + data.outOfStockItems.length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b; }
    .header h1 { margin: 0; color: #92400e; font-size: 20px; }
    .header p { margin: 4px 0 0 0; color: #78350f; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 10px 12px; background: #f8f9fa; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 13px; }
    .section-title { font-size: 16px; font-weight: 600; color: #333; margin: 24px 0 8px 0; }
    .footer { color: #999; font-size: 12px; margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Low Stock Digest</h1>
      <p>${totalAlerts} product${totalAlerts !== 1 ? 's' : ''} need attention</p>
    </div>

    <p style="color: #666; font-size: 14px;">
      Here is your daily inventory summary for ${new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
    </p>

    ${
      data.outOfStockItems.length > 0
        ? `
      <p class="section-title" style="color: #dc2626;">Out of Stock (${data.outOfStockItems.length})</p>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th style="text-align: center;">Stock</th>
          </tr>
        </thead>
        <tbody>
          ${outOfStockRows}
        </tbody>
      </table>
    `
        : ''
    }

    ${
      data.lowStockItems.length > 0
        ? `
      <p class="section-title" style="color: #d97706;">Low Stock (${data.lowStockItems.length})</p>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th style="text-align: center;">Stock</th>
            <th style="text-align: center;">Threshold</th>
          </tr>
        </thead>
        <tbody>
          ${lowStockRows}
        </tbody>
      </table>
    `
        : ''
    }

    <p style="margin-top: 24px; color: #666; font-size: 14px;">
      Log in to the <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/inventory" style="color: #2563eb;">admin inventory panel</a> to restock.
    </p>

    <div class="footer">
      <p>&copy; 2026 Muskan Care Center. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
