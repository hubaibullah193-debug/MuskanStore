'use client';

/**
 * Order Tracking Page
 * Allows customers to view order status, timeline, and request refunds
 * Supports both authenticated users and guests with token
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/app/components/ui/spinner';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { getOrderForDisplay, requestRefund } from '@/server/actions/orders';
import { getCurrentUser } from '@/server/actions/auth';

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const guestToken = searchParams.get('token');

  const [order, setOrder] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Get current user if authenticated
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
        }

        const result = await getOrderForDisplay(params.id, user?.id, guestToken || undefined);
        setOrder(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, guestToken]);

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      setRefundError('Please provide a refund reason');
      return;
    }

    if (!userId) {
      setRefundError('You must be logged in to request a refund');
      return;
    }

    setRefundLoading(true);
    setRefundError(null);

    try {
      await requestRefund(params.id, userId, refundReason);
      setRefundSuccess(true);
      setRefundReason('');
      setOrder((prev: any) => ({
        ...prev,
        order_status: 'refund_requested',
      }));
    } catch (err: any) {
      setRefundError(err.message || 'Failed to request refund');
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-text-secondary">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-paper py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Alert variant="error" className="p-6">
            <h1 className="font-display text-2xl font-bold mb-2">Error Loading Order</h1>
            <p className="mb-4">{error || 'Order not found'}</p>
            <Link href="/products" className="text-accent hover:underline">
              Return to shopping
            </Link>
          </Alert>
        </div>
      </div>
    );
  }

  const canRequestRefund = order.order_status === 'delivered';
  const refundAlreadyRequested =
    order.order_status === 'refund_requested' || order.order_status === 'refunded';

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Order Details</h1>
            <p className="text-text-secondary mt-1">Order #{order.order_number}</p>
          </div>
          <StatusBadge status={order.order_status} className="text-sm" />
        </div>

        {/* Order Timeline */}
        {Array.isArray(order.status_history) && order.status_history.length > 0 && (
          <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
            <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Order Timeline</h2>
            <div className="space-y-4">
              {order.status_history.map((entry: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-accent"></div>
                    {idx < order.status_history.length - 1 && (
                      <div className="w-0.5 h-12 bg-border my-2"></div>
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold text-foreground">
                      {entry.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {new Date(entry.changedAt).toLocaleString()}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-text-secondary mt-1">{entry.notes}</p>
                    )}
                    {entry.reason && (
                      <p className="text-sm text-text-secondary mt-1">Reason: {entry.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Order Items</h2>
              <div className="space-y-4">
                {Array.isArray(order.items) &&
                   order.items.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-start pb-4 border-b border-border last:pb-0 last:border-b-0">
                       <div>
                         {item.is_bundle && (
                           <span className="mr-1 rounded px-1.5 py-0.5 text-xs font-semibold align-middle bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent">
                             Bundle
                           </span>
                         )}
                         <p className="font-medium text-foreground">{item.product_name}</p>
                         {item.variant_name && (
                           <p className="text-sm text-text-secondary">{item.variant_name}</p>
                         )}
                         <p className="text-sm text-text-secondary">Quantity: {item.quantity}</p>
                         {item.is_bundle && Array.isArray(item.bundle_items) && (
                           <ul className="mt-1 space-y-0.5 text-sm text-text-tertiary">
                             {item.bundle_items.map((bi: any, i: number) => (
                               <li key={i} className="truncate">
                                 {bi.product_name || bi.product_id}
                                 {bi.variant_name ? ` (${bi.variant_name})` : ''} × {bi.quantity}
                               </li>
                             ))}
                           </ul>
                         )}
                       </div>
                       <div className="text-right">
                         <p className="font-medium text-foreground">Rs {(item.price).toFixed(0)}</p>
                         <p className="text-sm text-text-secondary">
                           Subtotal: Rs {(item.subtotal).toFixed(0)}
                         </p>
                       </div>
                     </div>
                   ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Delivery Address</h2>
              <div className="text-text-secondary space-y-1">
                {order.delivery_address?.recipient_name && (
                  <p className="font-medium text-foreground">{order.delivery_address.recipient_name}</p>
                )}
                {order.delivery_address?.phone && (
                  <p>{order.delivery_address.phone}</p>
                )}
                <p>{order.delivery_address?.street}</p>
                <p>
                  {order.delivery_address?.city}
                  {order.delivery_address?.postal_code && `, ${order.delivery_address.postal_code}`}
                </p>
              </div>
            </div>

            {/* Refund Request Section */}
            {canRequestRefund && !refundAlreadyRequested && (
              <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Request Refund</h2>
                <form onSubmit={handleRequestRefund} className="space-y-4">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-2">
                      Reason for Refund
                    </label>
                    <textarea
                      id="reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Please describe why you want to request a refund..."
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent resize-y"
                      rows={4}
                      disabled={refundLoading}
                    />
                  </div>
                  {refundError && (
                    <Alert variant="error">{refundError}</Alert>
                  )}
                  {refundSuccess && (
                    <Alert variant="success">
                      Refund request submitted successfully. An admin will review it shortly.
                    </Alert>
                  )}
                  <Button type="submit" disabled={refundLoading} className="w-full">
                    {refundLoading ? 'Submitting...' : 'Submit Refund Request'}
                  </Button>
                </form>
              </div>
            )}

            {refundAlreadyRequested && (
              <Alert variant="warning" className="p-6">
                <h2 className="font-display text-lg font-semibold mb-2">Refund Status</h2>
                <p>
                  {order.order_status === 'refund_requested'
                    ? 'Your refund request is being reviewed by our team.'
                    : 'Your refund has been processed.'}
                </p>
              </Alert>
            )}
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="bg-card border border-border rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Order Summary</h2>

              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal:</span>
                  <span>Rs {(order.subtotal).toFixed(0)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Tax (17%):</span>
                    <span>Rs {(order.tax_amount).toFixed(0)}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Delivery:</span>
                    <span>Rs {(order.delivery_fee).toFixed(0)}</span>
                  </div>
                )}
                {order.payment_fee > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Payment Fee:</span>
                    <span>Rs {(order.payment_fee).toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-semibold text-lg pt-4 mb-6 text-foreground">
                <span>Total:</span>
                <span>Rs {(order.total_amount).toFixed(0)}</span>
              </div>

              <div className="space-y-3 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Payment Method</p>
                  <p className="font-medium text-foreground capitalize">
                    {order.payment_method === 'cod'
                      ? 'Cash on Delivery'
                      : order.payment_method === 'jazz_cash'
                        ? 'JazzCash'
                        : 'Easypaisa'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Payment Status</p>
                  <div className="w-fit">
                    <StatusBadge status={order.payment_status} />
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button href="/products" variant="outline" className="w-full">
                  Continue Shopping
                </Button>
                <Button href="/contact" className="w-full">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
