// app/cart/page.tsx
// Shopping cart page with item management and checkout CTA

'use client';

import { useState, useEffect } from 'react';
import { CartItemRow } from '@/app/components/cart-item';
import { ProductCard } from '@/app/components/product-card';
import { useCart } from '@/lib/hooks/useCart';
import { getCartRecommendations } from '@/server/actions/products';
import Link from 'next/link';

export default function CartPage() {
  const { items, loading, error, updateItem, removeItem } = useCart();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);

  useEffect(() => {
    if (loading || items.length === 0) {
      setRecommendations(null);
      return;
    }
    let cancelled = false;
    getCartRecommendations(items.map((i) => i.productId))
      .then((recs) => {
        if (!cancelled) setRecommendations(recs);
      })
      .catch(() => {
        if (!cancelled) setRecommendations(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, items]);

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    try {
      setUpdateError(null);
      await updateItem(itemId, quantity);
    } catch (err) {
      setUpdateError('Failed to update quantity');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      setUpdateError(null);
      await removeItem(itemId);
    } catch (err) {
      setUpdateError('Failed to remove item');
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.17 * 100) / 100; // 17% tax
  const total = subtotal + tax;

  if (loading) {
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
              className="inline-block text-white font-semibold py-2 px-6 rounded-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                transition: 'background-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white rounded-lg p-6">
              <div className="space-y-0">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                    onRemove={() => handleRemove(item.id)}
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
                className="block w-full text-center text-white font-semibold py-3 rounded-lg transition"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  transition: 'background-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
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

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map((rp) => (
                <ProductCard
                  key={rp.id}
                  id={rp.id}
                  name={rp.name}
                  slug={rp.slug}
                  description={rp.description}
                  price={Number(rp.base_price)}
                  imageUrl={rp.imageUrl}
                  inStock={rp.stock_quantity > 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
