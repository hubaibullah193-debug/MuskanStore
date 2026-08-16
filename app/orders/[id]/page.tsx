'use client';

/**
 * Order Tracking Page
 * Allows customers to view order status, timeline, and request refunds
 * Supports both authenticated users and guests with token
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-900',
      pending_payment: 'bg-yellow-100 text-yellow-900',
      confirmed: 'bg-blue-100 text-blue-900',
      shipped: 'bg-purple-100 text-purple-900',
      delivered: 'bg-green-100 text-green-900',
      refund_requested: 'bg-orange-100 text-orange-900',
      refunded: 'bg-gray-100 text-gray-900',
      cancelled: 'bg-red-100 text-red-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-900';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      pending_payment: 'Awaiting Payment',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      refund_requested: 'Refund Requested',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Order</h1>
            <p className="text-red-700 mb-4">{error || 'Order not found'}</p>
            <Link href="/products" className="text-red-600 hover:text-red-700 underline">
              Return to shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canRequestRefund = order.order_status === 'delivered';
  const refundAlreadyRequested =
    order.order_status === 'refund_requested' || order.order_status === 'refunded';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-1">Order #{order.order_number}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(order.order_status)}`}>
            {getStatusLabel(order.order_status)}
          </div>
        </div>

        {/* Order Timeline */}
        {Array.isArray(order.status_history) && order.status_history.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {order.status_history.map((entry: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                    {idx < order.status_history.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-300 my-2"></div>
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold text-gray-900">
                      {getStatusLabel(entry.status)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(entry.changedAt).toLocaleString()}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>
                    )}
                    {entry.reason && (
                      <p className="text-sm text-gray-700 mt-1">Reason: {entry.reason}</p>
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start pb-4 border-b last:pb-0 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">{item.variant_name}</p>
                        )}
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Rs {(item.price / 100).toFixed(0)}</p>
                        <p className="text-sm text-gray-600">
                          Subtotal: Rs {(item.subtotal / 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
              <div className="text-gray-700 space-y-1">
                {order.delivery_address?.recipient_name && (
                  <p className="font-medium">{order.delivery_address.recipient_name}</p>
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Request Refund</h2>
                <form onSubmit={handleRequestRefund} className="space-y-4">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Refund
                    </label>
                    <textarea
                      id="reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Please describe why you want to request a refund..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      rows={4}
                      disabled={refundLoading}
                    />
                  </div>
                  {refundError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {refundError}
                    </div>
                  )}
                  {refundSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                      Refund request submitted successfully. An admin will review it shortly.
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={refundLoading}
                    className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refundLoading ? 'Submitting...' : 'Submit Refund Request'}
                  </button>
                </form>
              </div>
            )}

            {refundAlreadyRequested && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-orange-900 mb-2">Refund Status</h2>
                <p className="text-orange-700">
                  {order.order_status === 'refund_requested'
                    ? 'Your refund request is being reviewed by our team.'
                    : 'Your refund has been processed.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 pb-4 border-b">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>Rs {(order.subtotal / 100).toFixed(0)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (17%):</span>
                    <span>Rs {(order.tax_amount / 100).toFixed(0)}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery:</span>
                    <span>Rs {(order.delivery_fee / 100).toFixed(0)}</span>
                  </div>
                )}
                {order.payment_fee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Payment Fee:</span>
                    <span>Rs {(order.payment_fee / 100).toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-semibold text-lg pt-4 mb-6">
                <span>Total:</span>
                <span>Rs {(order.total_amount / 100).toFixed(0)}</span>
              </div>

              <div className="space-y-3 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-medium capitalize">
                    {order.payment_method === 'cod'
                      ? 'Cash on Delivery'
                      : order.payment_method === 'jazz_cash'
                        ? 'JazzCash'
                        : 'Easypaisa'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <p className={`font-medium px-2 py-1 rounded text-sm w-fit ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-green-900'
                      : order.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'bg-red-100 text-red-900'
                  }`}>
                    {order.payment_status === 'paid'
                      ? 'Paid'
                      : order.payment_status === 'pending'
                        ? 'Pending'
                        : 'Failed'}
                  </p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Link
                  href="/products"
                  className="block w-full bg-gray-200 text-gray-900 text-center py-2 rounded-lg font-medium hover:bg-gray-300"
                >
                  Continue Shopping
                </Link>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
