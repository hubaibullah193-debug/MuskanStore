'use client';

/**
 * Order Confirmation Page
 * Shows order summary after successful checkout
 * Redirects guests to order tracking with token
 * Displays payment instructions for online payments
 * Handles payment gateway redirects (JazzCash, Easypaisa)
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/app/components/ui/spinner';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';
import { getOrderForDisplay } from '@/server/actions/orders';

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const guestToken = searchParams.get('token');
  const paymentStatus = searchParams.get('payment');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);

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

  const handlePaymentRedirect = async (method: 'jazz_cash' | 'easypaisa') => {
    try {
      setRedirecting(true);
      setRedirectError(null);

      const endpoint = method === 'jazz_cash'
        ? '/api/payment/redirect/jazz-cash'
        : '/api/payment/redirect/easypaisa';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: params.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to redirect to payment gateway');
      }

      const data = await response.json();

      // Redirect to payment gateway
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('No redirect URL provided');
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Payment redirect failed';
      setRedirectError(message);
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-text-secondary">Loading order confirmation...</p>
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

  const isCOD = order.payment_method === 'cod';
  const isPending = order.payment_status === 'pending';

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <div
          className="rounded-lg p-6 mb-8 flex items-center gap-3"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--color-success) 10%, white)',
            border: '1px solid color-mix(in oklch, var(--color-success) 30%, transparent)',
          }}
        >
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-success">Order Confirmed!</h1>
            <p className="text-success">Thank you for your order.</p>
          </div>
        </div>

        {/* Order Number */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-2 text-foreground">Order Number</h2>
          <p className="text-2xl font-mono font-bold text-accent">{order.order_number}</p>
          {guestToken && (
            <div className="mt-3 p-3 bg-paper-2 rounded-lg border border-border">
              <p className="text-sm text-text-secondary mb-1">
                Your tracking code (save this to track your order):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-card px-3 py-2 rounded border border-border break-all">
                  {guestToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(guestToken);
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-paper-2 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Use this code at <Link href="/track-order" className="underline" style={{ color: 'var(--color-accent)' }}>Track Order</Link> along with your email to check order status anytime.
              </p>
            </div>
          )}
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div
            className="rounded-lg p-6 mb-6 flex items-center gap-3"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--color-success) 10%, white)',
              border: '1px solid color-mix(in oklch, var(--color-success) 30%, transparent)',
            }}
          >
            <svg className="h-6 w-6 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h2 className="font-display text-lg font-semibold text-success">Payment Successful</h2>
              <p className="text-success">Your payment has been processed and your order is confirmed.</p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div
            className="rounded-lg p-6 mb-6 flex items-start gap-3"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--color-error) 10%, white)',
              border: '1px solid color-mix(in oklch, var(--color-error) 30%, transparent)',
            }}
          >
            <svg className="h-6 w-6 text-error mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h2 className="font-display text-lg font-semibold text-error">Payment Failed</h2>
              <p className="text-error mb-3">Your payment was not processed. You can retry payment below.</p>
              {redirectError && (
                <p className="text-sm text-error mb-3">{redirectError}</p>
              )}
            </div>
          </div>
        )}

        {isPending && (
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--color-warning) 12%, white)',
              border: '1px solid color-mix(in oklch, var(--color-warning) 35%, transparent)',
            }}
          >
            <h2 className="font-display text-lg font-semibold text-[color-mix(in_oklch,var(--color-warning)_55%,black)] mb-4">Payment Required</h2>
            <p className="text-[color-mix(in_oklch,var(--color-warning)_55%,black)] mb-4">
              Your order is waiting for payment. Please select a payment method to proceed.
            </p>

            {/* Payment Method Buttons */}
            {order.payment_method !== 'cod' && (
              <div className="space-y-3 mb-4">
                {order.payment_method === 'jazz_cash' && (
                  <Button
                    onClick={() => handlePaymentRedirect('jazz_cash')}
                    disabled={redirecting}
                    className="w-full"
                  >
                    {redirecting ? 'Redirecting to JazzCash...' : 'Pay with JazzCash'}
                  </Button>
                )}

                {order.payment_method === 'easypaisa' && (
                  <Button
                    onClick={() => handlePaymentRedirect('easypaisa')}
                    disabled={redirecting}
                    className="w-full"
                  >
                    {redirecting ? 'Redirecting to Easypaisa...' : 'Pay with Easypaisa'}
                  </Button>
                )}
              </div>
            )}

            <p className="text-sm text-[color-mix(in_oklch,var(--color-warning)_55%,black)]">
              A payment link was also sent to {order.guest_email || 'your email'}.
              Check your email if you prefer to pay from there.
            </p>
          </div>
        )}

        {isCOD && (
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              backgroundColor: 'color-mix(in oklch, var(--color-info) 12%, white)',
              border: '1px solid color-mix(in oklch, var(--color-info) 35%, transparent)',
            }}
          >
            <h2 className="font-display text-lg font-semibold text-info mb-2">Cash on Delivery</h2>
            <p className="text-info">
              You will pay Rs {(order.total_amount).toFixed(0)} when your order arrives.
            </p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Order Summary</h2>

          <div className="space-y-4 mb-6 pb-6 border-b border-border">
            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start">
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
                  <p className="text-sm text-text-secondary">Qty: {item.quantity}</p>
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
                <p className="font-medium text-foreground">Rs {(item.subtotal).toFixed(0)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
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
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border text-foreground">
              <span>Total:</span>
              <span>Rs {(order.total_amount).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Delivery Address</h2>
          <div className="text-text-secondary space-y-1">
            {order.delivery_address?.recipient_name && (
              <p className="font-medium text-foreground">{order.delivery_address.recipient_name}</p>
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
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-display text-lg font-semibold mb-4 text-foreground">What&apos;s Next?</h2>
          <ol className="space-y-3 text-text-secondary">
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent flex items-center justify-center text-sm font-semibold">1</span>
              <span>
                {isPending ? 'Complete payment via the link sent to your email' : 'Your order is confirmed and will be processed'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent flex items-center justify-center text-sm font-semibold">2</span>
              <span>Receive order confirmation and shipping updates</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent flex items-center justify-center text-sm font-semibold">3</span>
              <span>Your items will be packaged and shipped</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent flex items-center justify-center text-sm font-semibold">4</span>
              <span>Track your delivery in real time</span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            href={guestToken ? `/order-confirmation/${order.id}?token=${guestToken}` : `/orders/${order.id}`}
            className="w-full"
          >
            Track Order
          </Button>
          <Button href="/products" variant="outline" className="w-full">
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
}
