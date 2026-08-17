import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

async function getFeaturedProducts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
}

async function getActiveBundles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
}

export default async function HomePage() {
  const [featuredProducts, bundles] = await Promise.all([
    getFeaturedProducts(),
    getActiveBundles(),
  ]);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="text-white" style={{backgroundImage: 'linear-gradient(to right, var(--color-accent), var(--color-accent-dark))'}}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Welcome to Muskan Care Center
            </h1>
            <p className="text-xl mb-8" style={{color: 'rgba(255, 255, 255, 0.85)'}}>
              Premium personal hygiene products for a healthier, cleaner you. Quality care, trusted by thousands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3 font-semibold text-white transition hover:opacity-90"
                style={{
                  backgroundColor: 'white',
                  color: 'var(--color-accent)',
                }}
              >
                Shop Now
              </Link>
              <Link
                href="#featured"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Explore Products
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Why Choose Muskan Care?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{backgroundColor: 'var(--color-accent)'}}>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Certified Quality
              </h3>
              <p className="text-gray-600">
                All products are tested and certified for safety and quality standards.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{backgroundColor: 'var(--color-accent)'}}>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Fast Shipping
              </h3>
              <p className="text-gray-600">
                Quick and reliable delivery to your doorstep within 2-3 business days.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-white" style={{backgroundColor: 'var(--color-accent)'}}>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                24/7 Support
              </h3>
              <p className="text-gray-600">
                Our customer support team is always here to help with any questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section id="featured" className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-gray-600">
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
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white hover:shadow-lg transition"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        Rs. {product.base_price.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
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
              <p className="text-gray-600 mb-4">No featured products available yet.</p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition hover:opacity-90"
                style={{backgroundColor: 'var(--color-accent)'}}
              >
                View All Products
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Bundle Deals Section */}
      {bundles.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Bundle Deals
              </h2>
              <p className="text-gray-600">
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
                    className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition"
                  >
                    {/* Bundle image: first item's image or gradient */}
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      {firstItemImage ? (
                        <img
                          src={firstItemImage}
                          alt={bundle.name}
                          className="w-full h-full object-cover"
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
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                          Save {bundle.discount_percent}%
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {bundle.name}
                      </h3>
                      {bundle.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {bundle.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-bold text-gray-900">
                          Rs. {Number(bundle.bundle_price).toFixed(0)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          Rs. {Number(bundle.regular_price).toFixed(0)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {bundleItems.length} products included
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
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of satisfied customers and discover the Muskan Care difference.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 font-semibold text-white transition hover:opacity-90"
            style={{backgroundColor: 'var(--color-accent)'}}
          >
            Browse Our Full Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
