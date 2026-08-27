// app/components/checkout-form.tsx
// Checkout form with delivery address and payment method selection

'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface CheckoutFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Processing...' : 'Complete Order'}
    </Button>
  );
}

export function CheckoutForm({ onSubmit, isLoading }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'jazz_cash' | 'easypaisa'>('cod');

  return (
    <form action={onSubmit} className="space-y-6">
      {/* Email Section (Guest Checkout) */}
      <div className="border-b border-border pb-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">Email Address</h2>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-secondary">
            Email
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            required
            placeholder="you@example.com"
          />
          <p className="mt-1 text-xs text-secondary">
            We&apos;ll send order updates and receipt to this email
          </p>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="border-b border-border pb-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">Delivery Address</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recipient Name */}
          <div>
            <label htmlFor="recipient_name" className="mb-1 block text-sm font-medium text-secondary">
              Recipient Name
            </label>
            <Input
              type="text"
              id="recipient_name"
              name="recipient_name"
              required
              placeholder="John Doe"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-secondary">
              Phone Number
            </label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              required
              placeholder="+923001234567"
            />
          </div>

          {/* Street Address */}
          <div className="md:col-span-2">
            <label htmlFor="street" className="mb-1 block text-sm font-medium text-secondary">
              Street Address
            </label>
            <Input
              type="text"
              id="street"
              name="street"
              required
              placeholder="123 Main Street"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium text-secondary">
              City
            </label>
            <Input
              type="text"
              id="city"
              name="city"
              required
              placeholder="Karachi"
            />
          </div>

          {/* Postal Code */}
          <div>
            <label htmlFor="postal_code" className="mb-1 block text-sm font-medium text-secondary">
              Postal Code
            </label>
            <Input
              type="text"
              id="postal_code"
              name="postal_code"
              placeholder="75500"
            />
          </div>
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="border-b border-border pb-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">Payment Method</h2>

        <div className="space-y-3">
          {/* COD */}
          <label className="flex cursor-pointer items-center rounded-lg border border-border p-3 hover:bg-paper-2">
            <input
              type="radio"
              name="payment_method"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3 accent-accent"
            />
            <div>
              <p className="font-medium text-foreground">Cash on Delivery</p>
              <p className="text-sm text-secondary">Pay when you receive your order</p>
            </div>
          </label>

          {/* JazzCash */}
          <label className="flex cursor-pointer items-center rounded-lg border border-border p-3 hover:bg-paper-2">
            <input
              type="radio"
              name="payment_method"
              value="jazz_cash"
              checked={paymentMethod === 'jazz_cash'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3 accent-accent"
            />
            <div>
              <p className="font-medium text-foreground">JazzCash</p>
              <p className="text-sm text-secondary">Pay via JazzCash mobile wallet</p>
            </div>
          </label>

          {/* Easypaisa */}
          <label className="flex cursor-pointer items-center rounded-lg border border-border p-3 hover:bg-paper-2">
            <input
              type="radio"
              name="payment_method"
              value="easypaisa"
              checked={paymentMethod === 'easypaisa'}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mr-3 accent-accent"
            />
            <div>
              <p className="font-medium text-foreground">Easypaisa</p>
              <p className="text-sm text-secondary">Pay via Easypaisa mobile wallet</p>
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
