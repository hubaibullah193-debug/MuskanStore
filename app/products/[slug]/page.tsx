// app/products/[slug]/page.tsx
// Product detail page with variants, add-to-cart, and related products

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/app/components/add-to-cart-button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Alert } from '@/app/components/ui/alert';
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
      <div className="min-h-screen bg-paper py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border border-border p-6 rounded-lg">
            {/* Product Image */}
            <div className="bg-paper-2 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[0].image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-text-tertiary">No image</span>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-4xl font-bold text-foreground mb-2">
                  {product.name}
                </h1>
                <p className="text-text-secondary">{product.description}</p>
              </div>

              {/* Price */}
              <div>
                <span className="font-display text-3xl font-bold text-foreground">
                  Rs. {Number(product.base_price).toFixed(2)}
                </span>
              </div>

              {/* Stock Status */}
              <div>
                <StatusBadge status={product.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'} />
              </div>

              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Available Variants
                  </h3>
                  <div className="space-y-2">
                    {variants.map((variant: any) => (
                      <div
                        key={variant.id}
                        className="border border-border rounded-lg p-3 cursor-pointer hover:border-accent transition-colors"
                      >
                        <p className="font-medium text-foreground">
                          {variant.variant_name}
                        </p>
                        <p className="text-sm text-text-tertiary">
                          SKU: {variant.sku}
                        </p>
                        {variant.price_adjustment !== 0 && (
                          <p className="text-sm text-text-secondary">
                            {variant.price_adjustment > 0 ? '+' : ''}Rs.{' '}
                            {Number(variant.price_adjustment).toFixed(2)}
                          </p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            variant.stock_quantity > 0
                              ? 'text-success'
                              : 'text-error'
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
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((rp) => (
                  <Link key={rp.id} href={`/products/${rp.slug}`}>
                    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-paper-2">
                        {rp.imageUrl ? (
                          <img
                            src={rp.imageUrl}
                            alt={rp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-foreground text-sm line-clamp-2">{rp.name}</h3>
                        <p className="text-sm font-bold text-foreground mt-1">
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
      <div className="min-h-screen bg-paper py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="error">
            Failed to load product. Please try again later.
          </Alert>
        </div>
      </div>
    );
  }
}
