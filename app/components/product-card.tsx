// components/product-card.tsx
// Product card for grid display with image, price, and CTA

import Link from 'next/link';
import Image from 'next/image';

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
  return (
    <Link href={`/products/${slug}`}>
      <div className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md" data-testid="product-card">
        {/* Product Image */}
        <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-gray-100">
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
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{name}</h3>

          {description && (
            <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
          )}

          {/* Price and Stock */}
          <div className="flex items-center justify-between pt-2">
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
        </div>
      </div>
    </Link>
  );
}
