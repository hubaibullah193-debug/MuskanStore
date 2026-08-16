// components/product-card.tsx
// Product card for grid display with image, price, and CTA

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/lib/hooks/useCart';

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
      <div className="group cursor-pointer rounded-lg border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-md" data-testid="product-card">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{name}</h3>

          {description && (
            <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
          )}

          {/* Price and Stock */}
          <div className="flex items-center justify-between pt-2 pb-3">
            <span className="text-lg font-bold text-gray-900">
              Rs. {price.toFixed(2)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                inStock
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock || isAdding}
            className="w-full disabled:bg-gray-400 text-white font-semibold py-2 rounded transition text-sm"
            style={{
              backgroundColor: !inStock || isAdding ? undefined : 'var(--color-accent)',
            }}
            onMouseEnter={(e) => !(!inStock || isAdding) && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
            onMouseLeave={(e) => !(!inStock || isAdding) && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>

          {/* Message */}
          {showMessage === 'success' && (
            <div className="text-xs text-green-600 text-center font-medium">
              Added to cart!
            </div>
          )}
          {showMessage === 'error' && (
            <div className="text-xs text-red-600 text-center font-medium">
              Failed to add
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
