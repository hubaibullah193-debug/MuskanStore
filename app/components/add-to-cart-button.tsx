// app/components/add-to-cart-button.tsx
// Client component to add items to cart

'use client';

import { useState } from 'react';

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  disabled?: boolean;
}

export default function AddToCartButton({
  productId,
  variantId,
  disabled = false,
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      // Call simple wrapper action that handles cart retrieval
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId: variantId || undefined,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to cart');
      }

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
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={disabled || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
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
