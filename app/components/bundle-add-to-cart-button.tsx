// app/components/bundle-add-to-cart-button.tsx
// Client component to add a bundle offer to the cart.

'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';

interface BundleProductRef {
  product_id: string;
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  quantity: number;
}

interface BundleAddToCartButtonProps {
  bundleId: string;
  bundleName: string;
  bundlePrice: number;
  bundleItems?: BundleProductRef[];
  disabled?: boolean;
}

export default function BundleAddToCartButton({
  bundleId,
  bundleName,
  bundlePrice,
  bundleItems,
  disabled = false,
}: BundleAddToCartButtonProps) {
  const { addBundleItem } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      await addBundleItem(bundleId, 1, bundlePrice, bundleName, bundleItems);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add bundle to cart';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAddToCart}
        disabled={disabled || isLoading}
        className="w-full"
      >
        {isLoading ? 'Adding...' : 'Add Bundle to Cart'}
      </Button>

      {error && (
        <Alert variant="error" className="text-xs">{error}</Alert>
      )}

      {success && (
        <Alert variant="success" className="text-xs">Bundle added to cart!</Alert>
      )}
    </div>
  );
}
