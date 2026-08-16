// app/cart/page.tsx
// Shopping cart page with item management and checkout CTA

'use client';

import { useEffect, useState } from 'react';
import { CartItemRow } from '@/app/components/cart-item';
import { CartItem } from '@/lib/utils/helpers';
import Link from 'next/link';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load cart from localStorage (simple implementation)
    // In production, fetch from server-side cart endpoint
    const cart = localStorage.getItem('cart');
    if (cart) {
      try {
        setItems(JSON.parse(cart));
      } catch (err) {
        setError('Failed to load cart');
      }
    }
    setIsLoading(false);
  }, []);

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index].quantity = quantity;
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.17 * 100) / 100; // 17% tax
  const total = subtotal + tax;

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 py-8 px-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6">
              <div className="space-y-0">
                {items.map((item, index) => (
                  <CartItemRow
                    key={index}
                    item={item}
                    onQuantityChange={(qty) => updateQuantity(index, qty)}
                    onRemove={() => removeItem(index)}
                  />
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg p-6 h-fit sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (17%)</span>
                  <span>Rs. {tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>Rs. {total.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/products"
                className="block w-full text-center mt-3 border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold py-3 rounded-lg transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
