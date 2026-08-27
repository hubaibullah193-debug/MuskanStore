// components/product-card.tsx
// Product card for grid display with image, price, and CTA

'use client';

import Link from 'next/link';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';
import { StatusBadge } from '@/app/components/ui/status-badge';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  imageUrl?: string;
  inStock: boolean;
}

export function ProductCard({
  id,
  name,
  slug,
  description,
  price,
  imageUrl,
  inStock,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showMessage, setShowMessage] = useState<'success' | 'error' | null>(null);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsAdding(true);
      setShowMessage(null);
      await addItem(id, undefined, 1, price);
      setShowMessage('success');
      setTimeout(() => setShowMessage(null), 2000);
    } catch (err) {
      setShowMessage('error');
      setTimeout(() => setShowMessage(null), 2000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link href={`/products/${slug}`}>
      <div
        className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        data-testid="product-card"
      >
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-paper-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-tertiary">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 font-semibold text-foreground">{name}</h3>

          {description && (
            <p className="line-clamp-2 text-sm text-secondary">{description}</p>
          )}

          {/* Price and Stock */}
          <div className="flex items-center justify-between pb-3 pt-2">
            <span className="text-lg font-bold text-foreground">
              Rs. {price.toFixed(2)}
            </span>
            <StatusBadge status={inStock ? 'in_stock' : 'out_of_stock'} />
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!inStock || isAdding}
            className="w-full"
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </Button>

          {/* Message */}
          {showMessage === 'success' && (
            <Alert variant="success" className="text-center">Added to cart!</Alert>
          )}
          {showMessage === 'error' && (
            <Alert variant="error" className="text-center">Failed to add</Alert>
          )}
        </div>
      </div>
    </Link>
  );
}
