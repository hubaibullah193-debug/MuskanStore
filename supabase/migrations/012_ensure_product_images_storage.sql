-- Migration 011: Product image storage (source of truth for admin image upload)
--
-- The admin product form uploads images via the service-role Supabase client
-- (server/actions/admin-products.ts -> uploadProductImage), which bypasses RLS,
-- so the bucket only needs to exist and be publicly readable for storefront
-- <img> tags to load without an auth token.
--
-- Declaring the bucket + read policy here keeps storage configuration in
-- migrations rather than relying solely on runtime bucket creation.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');
