// app/checkout/page.tsx
// Checkout page with address form, payment method, and order summary
// Uses API route to handle checkout server-side with proper inventory validation

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutForm } from '@/app/components/checkout-form';
import { Spinner } from '@/app/components/ui/spinner';
import { Alert } from '@/app/components/ui/alert';
import { useCart } from '@/lib/hooks/useCart';
import { useAuth } from '@/lib/hooks/useAuth';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, loading: cartLoading } = useCart();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    // Pre-fill guest email if not authenticated
    if (!user && !guestEmail) {
      const stored = localStorage.getItem('checkout_email');
      if (stored) setGuestEmail(stored);
    }
  }, [user, guestEmail]);

  const handleCheckout = async (formData: FormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate cart
      if (!items || items.length === 0) {
        setError('Cart is empty');
        return;
      }

      // Get form data
      const recipientName = formData.get('recipient_name') as string;
      const phone = formData.get('phone') as string;
      const street = formData.get('street') as string;
      const city = formData.get('city') as string;
      const postalCode = formData.get('postal_code') as string;
      const paymentMethod = formData.get('payment_method') as 'cod' | 'jazz_cash' | 'easypaisa';
      const email = formData.get('email') as string;

      // Validate email for guest checkout
      if (!user && !email) {
        setError('Email is required for guest checkout');
        return;
      }

      // Build checkout request
      // Reuse a stable idempotency key across retries so a double-submit or
      // failed network attempt does not create a duplicate order.
      const idemKey = sessionStorage.getItem('checkout_idempotency') || crypto.randomUUID();
      sessionStorage.setItem('checkout_idempotency', idemKey);

      const checkoutData = {
        items: items.map(item => {
          if (item.isBundle && item.bundleId) {
            // Bundle line: only the bundle id + quantity are sent. The server
            // re-resolves the bundle price and contents from the database and
            // never trusts a client-supplied price.
            return {
              bundle_id: item.bundleId,
              quantity: item.quantity,
            };
          }
          return {
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            price: item.price,
          };
        }),
        deliveryAddress: {
          street,
          city,
          postal_code: postalCode,
          recipient_name: recipientName,
          phone,
        },
        paymentMethod,
        guestEmail: email || undefined,
        idempotencyKey: idemKey,
      };

      // Call checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const result = await response.json();

      // Store email for future guest checkouts
      if (!user && email) {
        localStorage.setItem('checkout_email', email);
      }

      // Order placed (new or replayed) — clear the idempotency key for next time
      sessionStorage.removeItem('checkout_idempotency');

      // Clear the local guest cart so it doesn't persist after purchase
      localStorage.removeItem('mstore_cart_guest');

      // Redirect to confirmation/payment
      window.location.href = result.redirectUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setError(message);
      setIsLoading(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-text-secondary">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen bg-paper py-8 px-4">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-6">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Checkout</h1>
          <Alert variant="info">
            <div className="flex items-center justify-between gap-4">
              <span>Your cart is empty</span>
              <button
                onClick={() => router.push('/products')}
                className="text-accent hover:underline font-medium shrink-0"
              >
                Continue shopping
              </button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h1 className="font-display text-3xl font-bold text-foreground mb-6">Checkout</h1>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <CheckoutForm onSubmit={handleCheckout} isLoading={isLoading} />
        </div>

        {/* Order Summary */}
        <div className="bg-card border border-border rounded-lg p-6 h-fit">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Order Summary</h2>

          <div className="space-y-3 mb-6 pb-6 border-b border-border">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  {item.name || item.productId} × {item.quantity}
                </span>
                <span className="font-medium text-foreground">
                  Rs {(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>Rs {items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Tax (17%)</span>
              <span>Rs {(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.17).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Delivery</span>
              <span>Rs 300</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border text-foreground">
              <span>Total</span>
              <span>Rs {(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.17 + 300).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
