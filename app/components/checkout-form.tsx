// app/components/checkout-form.tsx
// Checkout form with delivery address and payment method selection

'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

interface CheckoutFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
      style={{
        backgroundColor: pending ? undefined : 'var(--color-accent)',
      }}
      onMouseEnter={(e) => !pending && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
      onMouseLeave={(e) => !pending && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
    >
      {pending ? 'Processing...' : 'Complete Order'}
    </button>
  );
}

export function CheckoutForm({ onSubmit, isLoading }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'jazz_cash' | 'easypaisa'>('cod');

  return (
    <form action={onSubmit} className="space-y-6">
      {/* Email Section (Guest Checkout) */}
      <div className="border-b pb-6">
        <h2 className="text-xl font-bold mb-4">Email Address</h2>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
            placeholder="you@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll send order updates and receipt to this email
          </p>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="border-b pb-6">
        <h2 className="text-xl font-bold mb-4">Delivery Address</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recipient Name */}
          <div>
            <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              id="recipient_name"
              name="recipient_name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
              placeholder="+923001234567"
            />
          </div>

          {/* Street Address */}
          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              id="street"
              name="street"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
              placeholder="123 Main Street"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
              placeholder="Karachi"
            />
          </div>

          {/* Postal Code */}
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              '--tw-ring-color': 'var(--color-accent)',
            } as React.CSSProperties}
              placeholder="75500"
            />
          </div>
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="border-b pb-6">
        <h2 className="text-xl font-bold mb-4">Payment Method</h2>

        <div className="space-y-3">
          {/* COD */}
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment_method"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">Cash on Delivery</p>
              <p className="text-sm text-gray-500">Pay when you receive your order</p>
            </div>
          </label>

          {/* JazzCash */}
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment_method"
              value="jazz_cash"
              checked={paymentMethod === 'jazz_cash'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">JazzCash</p>
              <p className="text-sm text-gray-500">Pay via JazzCash mobile wallet</p>
            </div>
          </label>

          {/* Easypaisa */}
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment_method"
              value="easypaisa"
              checked={paymentMethod === 'easypaisa'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">Easypaisa</p>
              <p className="text-sm text-gray-500">Pay via Easypaisa mobile wallet</p>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
