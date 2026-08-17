// app/checkout/page.tsx
// Checkout page with address form, payment method, and order summary
// Uses API route to handle checkout server-side with proper inventory validation

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutForm } from '@/app/components/checkout-form';
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
      const checkoutData = {
        items: items.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
          price: item.price,
        })),
        deliveryAddress: {
          street,
          city,
          postal_code: postalCode,
          recipient_name: recipientName,
          phone,
        },
        paymentMethod,
        guestEmail: email || undefined,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 mb-4">Your cart is empty</p>
            <button
              onClick={() => router.push('/products')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <CheckoutForm onSubmit={handleCheckout} isLoading={isLoading} />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

          <div className="space-y-3 mb-6 pb-6 border-b">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name || item.productId} × {item.quantity}
                </span>
                <span className="font-medium text-gray-900">
                  Rs {(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rs {items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (17%)</span>
              <span>Rs {(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.17).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>Rs 300</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t text-gray-900">
              <span>Total</span>
              <span>Rs {(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.17 + 300).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
