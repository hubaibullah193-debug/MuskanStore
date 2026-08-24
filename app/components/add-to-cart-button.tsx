// app/components/add-to-cart-button.tsx
// Client component to add items to cart

'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';

interface AddToCartButtonProps {
  productId: string;
  price: number;
  productName?: string;
  variantId?: string;
  disabled?: boolean;
}

export default function AddToCartButton({
  productId,
  price,
  productName,
  variantId,
  disabled = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      // Use the useCart hook to add item
      await addItem(productId, variantId, quantity, price, productName);

      setSuccess(true);
      setQuantity(1);

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Quantity Input */}
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="font-medium text-gray-700">
          Quantity:
        </label>
        <input
          id="quantity"
          type="number"
          min="1"
          max="99"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center focus:outline-none focus:ring-2"
          style={{
            '--tw-ring-color': 'var(--color-accent)',
          } as React.CSSProperties}
        />
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={disabled || isLoading}
        className="w-full disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
        style={{
          backgroundColor: disabled || isLoading ? undefined : 'var(--color-accent)',
        }}
        onMouseEnter={(e) => !(disabled || isLoading) && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
        onMouseLeave={(e) => !(disabled || isLoading) && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
      >
        {isLoading ? 'Adding...' : 'Add to Cart'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">Added to cart!</p>
        </div>
      )}
    </div>
  );
}
