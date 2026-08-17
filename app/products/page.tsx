// app/products/page.tsx
// Products listing page with filtering and pagination

import { supabase } from '@/lib/supabase/client';
import { ProductCard } from '@/app/components/product-card';

interface ProductsPageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = Math.max(1, parseInt(searchParams.page || '1'));
  const limit = 12;
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('products')
      .select('id, name, slug, description, base_price, stock_quantity, is_active, product_images(image_url, display_order)', {
        count: 'exact',
      })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchParams.search) {
      query = query.ilike('name', `%${searchParams.search}%`);
    }

    const { data: products, count, error } = await query;

    if (error) {
      throw error;
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
            <p className="text-gray-600">
              Browse our collection of {count} products
            </p>
          </div>

          {/* Search Bar */}
          <form className="mb-8">
            <input
              type="text"
              name="search"
              placeholder="Search products..."
              defaultValue={searchParams.search || ''}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2"
              style={{
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties}
            />
          </form>

          {/* Products Grid */}
          {products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {products.map((product) => {
                  const images = (product.product_images || [])
                    .sort((a: any, b: any) => a.display_order - b.display_order);
                  const imageUrl = images.length > 0 ? images[0].image_url : undefined;
                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      slug={product.slug}
                      description={product.description}
                      price={Number(product.base_price)}
                      imageUrl={imageUrl}
                      inStock={product.stock_quantity > 0}
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {page > 1 && (
                    <a
                      href={`/products?page=${page - 1}${
                        searchParams.search ? `&search=${searchParams.search}` : ''
                      }`}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Previous
                    </a>
                  )}

                  <span className="px-4 py-2">
                    Page {page} of {totalPages}
                  </span>

                  {page < totalPages && (
                    <a
                      href={`/products?page=${page + 1}${
                        searchParams.search ? `&search=${searchParams.search}` : ''
                      }`}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Next
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load products. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
