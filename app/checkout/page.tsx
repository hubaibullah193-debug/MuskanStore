// app/checkout/page.tsx
// Checkout page with address form, payment method, and order summary

'use client';

import { useState } from 'react';
import { CheckoutForm } from '@/app/components/checkout-form';
import { createOrder } from '@/server/actions/orders';
import { generateJazzCashUrl } from '@/server/actions/payments';

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleCheckout = async (formData: FormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get form data
      const recipientName = formData.get('recipient_name') as string;
      const phone = formData.get('phone') as string;
      const street = formData.get('street') as string;
      const city = formData.get('city') as string;
      const postalCode = formData.get('postal_code') as string;
      const paymentMethod = formData.get('payment_method') as 'cod' | 'jazz_cash' | 'easypaisa';

      // Load cart from localStorage
      const cart = localStorage.getItem('cart');
      if (!cart) {
        setError('Cart is empty');
        return;
      }

      const items = JSON.parse(cart);
      if (items.length === 0) {
        setError('Cart is empty');
        return;
      }

      // Create order
      const order = await createOrder(
        null, // userId - null for guest
        null, // guestEmail - TODO: get from form
        items,
        {
          street,
          city,
          postal_code: postalCode,
          recipient_name: recipientName,
          phone,
        },
        paymentMethod,
        0.17, // 17% tax
        300 // Rs. 300 delivery fee
      );

      setOrderCreated(true);
      setOrderId(order.id);
      localStorage.removeItem('cart');

      // Redirect based on payment method
      if (paymentMethod === 'cod') {
        // Redirect to order confirmation
        window.location.href = `/order-confirmation/${order.id}?token=${order.guest_token}`;
      } else if (paymentMethod === 'jazz_cash') {
        // Redirect to JazzCash payment
        const paymentUrl = await generateJazzCashUrl(order.id, order.total_amount);
        window.location.href = paymentUrl;
      } else if (paymentMethod === 'easypaisa') {
        // Redirect to Easypaisa payment
        window.location.href = `/payment/easypaisa?orderId=${order.id}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      setError(message);
      setIsLoading(false);
    }
  };

  if (orderCreated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Created
          </h1>
          <p className="text-gray-600 mb-4">
            Your order has been created. Redirecting to payment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <CheckoutForm onSubmit={handleCheckout} isLoading={isLoading} />
      </div>
    </div>
  );
}
