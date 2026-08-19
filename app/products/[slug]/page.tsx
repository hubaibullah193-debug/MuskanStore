// app/products/[slug]/page.tsx
// Product detail page with variants, add-to-cart, and related products

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/app/components/add-to-cart-button';
import Link from 'next/link';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  try {
    const supabase = await createClient();
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
        category_id,
        product_variants (
          id,
          sku,
          variant_name,
          price_adjustment,
          stock_quantity,
          is_active
        ),
        product_images (
          id,
          image_url,
          display_order
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

    const images = (product.product_images || []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    );

    // Fetch related products from same category (exclude current, max 4)
    let relatedProducts: any[] = [];
    if (product.category_id) {
      const { data: related } = await supabase
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
          product_images (
            id,
            image_url,
            display_order
          )
        `
        )
        .eq('category_id', product.category_id)
        .eq('is_active', true)
        .neq('id', product.id)
        .limit(4);

      relatedProducts = (related || []).map((p: any) => ({
        ...p,
        imageUrl: p.product_images?.length
          ? p.product_images.sort((a: any, b: any) => a.display_order - b.display_order)[0].image_url
          : undefined,
      }));
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-lg">
            {/* Product Image */}
            <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[0].image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400">No image</span>
              )}
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
                        className="border border-gray-300 rounded-lg p-3 cursor-pointer"
                        style={{
                          borderColor: 'var(--color-border)',
                          transition: 'border-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
                        }}
                        className="hover:border-accent"
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
                price={Number(product.base_price)}
                productName={product.name}
                disabled={product.stock_quantity === 0}
              />
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((rp) => (
                  <Link key={rp.id} href={`/products/${rp.slug}`}>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-gray-100">
                        {rp.imageUrl ? (
                          <img
                            src={rp.imageUrl}
                            alt={rp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{rp.name}</h3>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          Rs. {Number(rp.base_price).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
