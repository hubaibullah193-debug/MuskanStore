-- 004_create_bundle_items.sql
-- Bundle items table

create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.bundle_items enable row level security;

-- Users can read bundle items for active bundles
create policy "bundle_items_read_active" on public.bundle_items
  for select using (
    exists (
      select 1 from public.bundles b
      where b.id = bundle_id and b.is_active = true
    )
  );

-- Admins can manage all bundle items
create policy "bundle_items_admin_all" on public.bundle_items
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- Grants
grant select on public.bundle_items to authenticated;
grant insert, update, delete on public.bundle_items to authenticated;

comment on table public.bundle_items is 'Individual products within a bundle offer';