-- 004_seed_sample_products.sql
-- Sample products and variants for development and testing

-- Clear existing data (safe for dev environment)
delete from public.product_variants;
delete from public.products;

-- Insert sample products (3 featured, 3 regular)
insert into public.products (name, slug, description, base_price, stock_quantity, is_active, featured)
values
  (
    'Classic Cotton T-Shirt',
    'classic-cotton-tshirt',
    'High-quality 100% organic cotton t-shirt. Comfortable for everyday wear. Available in multiple colors and sizes.',
    29.99,
    150,
    true,
    true
  ),
  (
    'Premium Denim Jeans',
    'premium-denim-jeans',
    'Timeless five-pocket denim jeans made from premium cotton blend. Perfect fit and durability.',
    79.99,
    85,
    true,
    true
  ),
  (
    'Wool Blend Sweater',
    'wool-blend-sweater',
    'Cozy wool and acrylic blend sweater. Warm, soft, and perfect for cooler seasons.',
    59.99,
    120,
    true,
    true
  ),
  (
    'Linen Summer Dress',
    'linen-summer-dress',
    'Light and breathable linen dress perfect for summer. Elegant and versatile for any occasion.',
    49.99,
    95,
    true,
    false
  ),
  (
    'Casual Canvas Jacket',
    'casual-canvas-jacket',
    'Durable canvas jacket with a relaxed fit. Great layering piece for spring and fall.',
    89.99,
    60,
    true,
    false
  ),
  (
    'Athletic Performance Hoodie',
    'athletic-performance-hoodie',
    'Moisture-wicking performance hoodie for sports and active wear. Breathable and comfortable.',
    69.99,
    110,
    true,
    false
  );

-- Get product IDs for variant insertion
with product_data as (
  select id, name from public.products
)
insert into public.product_variants (product_id, sku, variant_name, price_adjustment, stock_quantity, is_active)
select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'classic-cotton-tshirt'
  ) p,
  (
    values
      ('white-s', 'White - Small', 0, 40),
      ('white-m', 'White - Medium', 0, 45),
      ('white-l', 'White - Large', 0, 35),
      ('black-s', 'Black - Small', 0, 25),
      ('black-m', 'Black - Medium', 0, 30),
      ('black-l', 'Black - Large', 0, 20),
      ('navy-s', 'Navy - Small', 0, 20),
      ('navy-m', 'Navy - Medium', 0, 25),
      ('navy-l', 'Navy - Large', 0, 15)
  ) v(variant_code, variant_name, price_adj, stock)

union all

select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'premium-denim-jeans'
  ) p,
  (
    values
      ('blue-30', 'Blue Wash - 30', 0, 20),
      ('blue-32', 'Blue Wash - 32', 0, 22),
      ('blue-34', 'Blue Wash - 34', 0, 18),
      ('black-30', 'Black - 30', 5, 15),
      ('black-32', 'Black - 32', 5, 18),
      ('black-34', 'Black - 34', 5, 12),
      ('grey-30', 'Grey Wash - 30', 0, 10)
  ) v(variant_code, variant_name, price_adj, stock)

union all

select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'wool-blend-sweater'
  ) p,
  (
    values
      ('charcoal-xs', 'Charcoal - XS', 0, 20),
      ('charcoal-s', 'Charcoal - Small', 0, 25),
      ('charcoal-m', 'Charcoal - Medium', 0, 22),
      ('charcoal-l', 'Charcoal - Large', 0, 18),
      ('cream-m', 'Cream - Medium', 0, 20),
      ('cream-l', 'Cream - Large', 0, 15),
      ('navy-m', 'Navy - Medium', 0, 19)
  ) v(variant_code, variant_name, price_adj, stock)

union all

select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'linen-summer-dress'
  ) p,
  (
    values
      ('white-xs', 'White - XS', 0, 15),
      ('white-s', 'White - Small', 0, 18),
      ('white-m', 'White - Medium', 0, 20),
      ('beige-s', 'Beige - Small', 0, 14),
      ('beige-m', 'Beige - Medium', 0, 13),
      ('beige-l', 'Beige - Large', 0, 15)
  ) v(variant_code, variant_name, price_adj, stock)

union all

select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'casual-canvas-jacket'
  ) p,
  (
    values
      ('khaki-s', 'Khaki - Small', 0, 12),
      ('khaki-m', 'Khaki - Medium', 0, 15),
      ('khaki-l', 'Khaki - Large', 0, 10),
      ('olive-m', 'Olive - Medium', 0, 12),
      ('olive-l', 'Olive - Large', 0, 11),
      ('navy-s', 'Navy - Small', 0, 10)
  ) v(variant_code, variant_name, price_adj, stock)

union all

select
  p.id,
  concat(p.slug, '-', v.variant_code),
  v.variant_name,
  v.price_adj,
  v.stock,
  true
from
  (
    select id, slug from public.products where slug = 'athletic-performance-hoodie'
  ) p,
  (
    values
      ('black-s', 'Black - Small', 0, 25),
      ('black-m', 'Black - Medium', 0, 30),
      ('black-l', 'Black - Large', 0, 22),
      ('grey-s', 'Grey - Small', 0, 20),
      ('grey-m', 'Grey - Medium', 0, 21),
      ('grey-l', 'Grey - Large', 0, 12)
  ) v(variant_code, variant_name, price_adj, stock);
