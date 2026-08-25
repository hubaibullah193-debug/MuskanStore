// app/components/bundle-add-to-cart-button.tsx
// Client component to add a bundle offer to the cart.

'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';

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
      <button
        onClick={handleAddToCart}
        disabled={disabled || isLoading}
        className="w-full disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition"
        style={{
          backgroundColor: disabled || isLoading ? undefined : 'var(--color-accent)',
        }}
        onMouseEnter={(e) =>
          !(disabled || isLoading) && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')
        }
        onMouseLeave={(e) =>
          !(disabled || isLoading) && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')
        }
      >
        {isLoading ? 'Adding...' : 'Add Bundle to Cart'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-red-800 text-xs">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-green-800 text-xs">Bundle added to cart!</p>
        </div>
      )}
    </div>
  );
}
