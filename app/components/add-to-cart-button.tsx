// app/components/add-to-cart-button.tsx
// Client component to add items to cart

'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert } from '@/app/components/ui/alert';

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
        <label htmlFor="quantity" className="font-medium text-secondary">
          Quantity:
        </label>
        <Input
          id="quantity"
          type="number"
          min="1"
          max="99"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 text-center"
        />
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={disabled || isLoading}
        className="w-full"
      >
        {isLoading ? 'Adding...' : 'Add to Cart'}
      </Button>

      {/* Error Message */}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert variant="success">Added to cart!</Alert>
      )}
    </div>
  );
}
