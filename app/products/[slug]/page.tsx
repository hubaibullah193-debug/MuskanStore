// app/products/[slug]/page.tsx
// Product detail page with variants and add-to-cart

import { supabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/app/components/add-to-cart-button';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        base_price,
        stock_quantity,
        is_active,
        product_variants (
          id,
          sku,
          variant_name,
          price_adjustment,
          stock_quantity,
          is_active
        )
      `
      )
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      notFound();
    }

    const variants = (product.product_variants || []).filter(
      (v: any) => v.is_active
    );

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg">
            {/* Product Image */}
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
              <span className="text-gray-400">Product Image</span>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <p className="text-gray-600">{product.description}</p>
              </div>

              {/* Price */}
              <div>
                <span className="text-3xl font-bold text-gray-900">
                  Rs. {Number(product.base_price).toFixed(2)}
                </span>
              </div>

              {/* Stock Status */}
              <div>
                <span
                  className={`inline-block px-4 py-2 rounded-lg font-medium ${
                    product.stock_quantity > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} in stock`
                    : 'Out of stock'}
                </span>
              </div>

              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Available Variants
                  </h3>
                  <div className="space-y-2">
                    {variants.map((variant: any) => (
                      <div
                        key={variant.id}
                        className="border border-gray-300 rounded-lg p-3 hover:border-blue-500 cursor-pointer"
                      >
                        <p className="font-medium text-gray-900">
                          {variant.variant_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          SKU: {variant.sku}
                        </p>
                        {variant.price_adjustment !== 0 && (
                          <p className="text-sm text-gray-600">
                            {variant.price_adjustment > 0 ? '+' : ''}Rs.{' '}
                            {Number(variant.price_adjustment).toFixed(2)}
                          </p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            variant.stock_quantity > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {variant.stock_quantity > 0
                            ? `${variant.stock_quantity} available`
                            : 'Out of stock'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart */}
              <AddToCartButton
                productId={product.id}
                disabled={product.stock_quantity === 0}
              />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Failed to load product. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
