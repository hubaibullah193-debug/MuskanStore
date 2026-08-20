-- 010_create_bundles_table.sql
-- Bundle offers table

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  bundle_price numeric(10,2) not null,
  regular_price numeric(10,2) not null,
  discount_percent integer not null default 0,
  is_active boolean not null default true,
  active_from timestamp with time zone,
  active_to timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.bundles enable row level security;

-- Public can read active bundles
create policy "bundles_read_active" on public.bundles
  for select using (is_active = true);

-- Admins can manage all bundles
create policy "bundles_admin_all" on public.bundles
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- Grants
grant select on public.bundles to authenticated;
grant insert, update, delete on public.bundles to authenticated;

comment on table public.bundles is 'Bundle offers: groups of products sold at a discounted price';