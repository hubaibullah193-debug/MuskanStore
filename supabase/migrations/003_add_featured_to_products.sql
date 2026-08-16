-- 003_add_featured_to_products.sql
-- Add featured flag to highlight products on homepage

alter table public.products
  add column featured boolean default false;

-- Index for efficient featured product filtering
create index idx_products_featured on public.products(featured) where featured = true;
