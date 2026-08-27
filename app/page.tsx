import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/app/components/ui/button';
import BundleAddToCartButton from '@/app/components/bundle-add-to-cart-button';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shop Premium Personal Hygiene Products',
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} — Premium Personal Hygiene Store`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    title: `${SITE_NAME} — Premium Personal Hygiene Store`,
    description: SITE_DESCRIPTION,
  },
};

export const revalidate = 300;

const getFeaturedProducts = unstable_cache(
  async () => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(image_url, display_order)')
        .eq('featured', true)
        .limit(6);

      if (error) {
        console.error('Error fetching featured products:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Error fetching featured products:', e);
      return [];
    }
  },
  ['home-featured-products'],
  { revalidate: 300, tags: ['products'] }
);

const getActiveBundles = unstable_cache(
  async () => {
    try {
      const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('bundles')
      .select(
        `
        id,
        name,
        description,
        bundle_price,
        regular_price,
        discount_percent,
        bundle_items (
          product_id,
          quantity,
          products (id, name, slug, base_price, product_images(image_url, display_order))
        )
      `
      )
      .eq('is_active', true)
      .or(`active_from.is.null,active_from.lte.${now}`)
      .or(`active_to.is.null,active_to.gte.${now}`)
      .limit(3);

    if (error) {
      console.error('Error fetching bundles:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Error fetching bundles:', e);
    return [];
  }
  },
  ['home-active-bundles'],
  { revalidate: 300, tags: ['bundles'] }
);

export default async function HomePage() {
  const [featuredProducts, bundles] = await Promise.all([
    getFeaturedProducts(),
    getActiveBundles(),
  ]);

  return (
    <div className="w-full bg-paper">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--color-accent-light) 45%, white), var(--color-paper-3))',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Welcome to Muskan Care Center
            </h1>
            <p className="text-xl text-text-secondary mb-8">
              Premium personal hygiene products for a healthier, cleaner you. Quality care, trusted by thousands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/products" size="lg">
                Shop Now
              </Button>
              <Button href="#featured" variant="outline" size="lg">
                Explore Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-paper py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-12 text-center">
            Why Choose Muskan Care?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white bg-accent">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Certified Quality
              </h3>
              <p className="text-text-secondary">
                All products are tested and certified for safety and quality standards.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white bg-accent">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Fast Shipping
              </h3>
              <p className="text-text-secondary">
                Quick and reliable delivery to your doorstep within 2-3 business days.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white bg-accent">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                24/7 Support
              </h3>
              <p className="text-text-secondary">
                Our customer support team is always here to help with any questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="featured" className="bg-paper-2 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Featured Products
            </h2>
            <p className="text-text-secondary">
              Discover our most popular personal care items loved by customers.
            </p>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => {
                const images = (product.product_images || [])
                  .sort((a: any, b: any) => a.display_order - b.display_order);
                const imageUrl = images.length > 0 ? images[0].image_url : undefined;
                return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group overflow-hidden rounded-lg border border-border bg-card hover:shadow-md transition"
                >
                  <div className="relative aspect-square overflow-hidden bg-paper-2">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-text-tertiary">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">
                        Rs. {product.base_price.toLocaleString()}
                      </span>
                      <span className="text-sm text-text-tertiary">
                        Stock: {product.stock_quantity}
                      </span>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-4">No featured products available yet.</p>
              <Button href="/products">
                View All Products
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Bundle Deals Section */}
      {bundles.length > 0 && (
        <section className="bg-paper py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-4">
                Bundle Deals
              </h2>
              <p className="text-text-secondary">
                Save more when you buy together. Limited-time bundle offers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bundles.map((bundle: any) => {
                const bundleItems = bundle.bundle_items || [];
                const firstItemImage = bundleItems[0]?.products?.product_images?.[0]?.image_url;
                return (
                  <div
                    key={bundle.id}
                    className="rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition"
                  >
                    {/* Bundle image: first item's image or gradient */}
                    <div className="aspect-[4/3] bg-paper-2 relative">
                      {firstItemImage ? (
                        <Image
                          src={firstItemImage}
                          alt={bundle.name}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{backgroundImage: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent))'}}
                        >
                          <span className="text-white text-3xl font-bold">🎁</span>
                        </div>
                      )}
                      {bundle.discount_percent > 0 && (
                        <div className="absolute top-3 right-3 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
                          Save {bundle.discount_percent}%
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg font-bold text-foreground mb-1">
                        {bundle.name}
                      </h3>
                      {bundle.description && (
                        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                          {bundle.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-bold text-foreground">
                          Rs. {Number(bundle.bundle_price).toFixed(0)}
                        </span>
                        <span className="text-sm text-text-tertiary line-through">
                          Rs. {Number(bundle.regular_price).toFixed(0)}
                        </span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {bundleItems.length} products included
                      </div>
                      <div className="mt-4">
                        <BundleAddToCartButton
                          bundleId={bundle.id}
                          bundleName={bundle.name}
                          bundlePrice={Number(bundle.bundle_price)}
                          bundleItems={bundleItems.map((bi: any) => ({
                            product_id: bi.product_id,
                            product_name: bi.products?.name,
                            variant_id: bi.variant_id ?? null,
                            variant_name: null,
                            quantity: bi.quantity,
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-paper-2 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join thousands of satisfied customers and discover the Muskan Care difference.
          </p>
          <Button href="/products" size="lg">
            Browse Our Full Collection
          </Button>
        </div>
      </section>
    </div>
  );
}
