'use client';

/**
 * Order Confirmation Page
 * Shows order summary after successful checkout
 * Redirects guests to order tracking with token
 * Displays payment instructions for online payments
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getOrderForDisplay } from '@/server/actions/orders';

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const guestToken = searchParams.get('token');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const result = await getOrderForDisplay(params.id, undefined, guestToken || undefined);
        setOrder(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, guestToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading order confirmation...</p>
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

  const isCOD = order.payment_method === 'cod';
  const isPending = order.payment_status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-900">Order Confirmed!</h1>
              <p className="text-green-700">Thank you for your order.</p>
            </div>
          </div>
        </div>

        {/* Order Number */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Order Number</h2>
          <p className="text-2xl font-mono font-bold text-blue-600">{order.order_number}</p>
          {guestToken && (
            <p className="text-sm text-gray-600 mt-2">
              Save this number to track your order
            </p>
          )}
        </div>

        {/* Payment Status */}
        {isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4">Payment Required</h2>
            <p className="text-yellow-700 mb-4">
              Your order is waiting for payment. Please complete payment to proceed.
            </p>
            {order.payment_method === 'jazz_cash' && (
              <p className="text-yellow-700 text-sm">
                A payment link was sent to {order.guest_email || 'your email'}.
                Check your email for payment instructions.
              </p>
            )}
            {order.payment_method === 'easypaisa' && (
              <p className="text-yellow-700 text-sm">
                A payment link was sent to {order.guest_email || 'your email'}.
                Check your email for payment instructions.
              </p>
            )}
          </div>
        )}

        {isCOD && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Cash on Delivery</h2>
            <p className="text-blue-700">
              You will pay Rs {(order.total_amount / 100).toFixed(0)} when your order arrives.
            </p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

          <div className="space-y-4 mb-6 pb-6 border-b">
            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-sm text-gray-600">{item.variant_name}</p>
                  )}
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">Rs {(item.subtotal / 100).toFixed(0)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
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
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>Rs {(order.total_amount / 100).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
          <div className="text-gray-700 space-y-1">
            {order.delivery_address?.recipient_name && (
              <p className="font-medium">{order.delivery_address.recipient_name}</p>
            )}
            {order.delivery_address?.phone && (
              <p>{order.delivery_address.phone}</p>
            )}
            <p>{order.delivery_address?.street}</p>
            <p>{order.delivery_address?.city}</p>
            {order.delivery_address?.postal_code && (
              <p>{order.delivery_address.postal_code}</p>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">What's Next?</h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">1</span>
              <span>
                {isPending ? 'Complete payment via the link sent to your email' : 'Your order is confirmed and will be processed'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">2</span>
              <span>Receive order confirmation and shipping updates</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">3</span>
              <span>Your items will be packaged and shipped</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">4</span>
              <span>Track your delivery in real time</span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href={guestToken ? `/orders/${order.id}?token=${guestToken}` : `/orders/${order.id}`}
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Track Order
          </Link>
          <Link
            href="/products"
            className="block w-full bg-gray-200 text-gray-900 text-center py-3 rounded-lg font-medium hover:bg-gray-300"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
