-- 002_rls_policies.sql
-- Row Level Security (RLS) policies for all tables

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_audit_logs enable row level security;

-- PRODUCTS: Public read-only, admin can modify
create policy "products_public_read" on public.products
  for select using (true);

create policy "products_admin_all" on public.products
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- PRODUCT_VARIANTS: Public read-only, admin can modify
create policy "product_variants_public_read" on public.product_variants
  for select using (true);

create policy "product_variants_admin_all" on public.product_variants
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- CART_ITEMS: Users/guests can manage their own cart
create policy "cart_items_user_select" on public.cart_items
  for select using (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

create policy "cart_items_user_insert" on public.cart_items
  for insert with check (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

create policy "cart_items_user_update" on public.cart_items
  for update using (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  ) with check (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

create policy "cart_items_user_delete" on public.cart_items
  for delete using (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

-- ORDERS: Users/guests can view their own, admins can view all
create policy "orders_user_select" on public.orders
  for select using (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email or
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

create policy "orders_user_insert" on public.orders
  for insert with check (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

create policy "orders_user_update" on public.orders
  for update using (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  ) with check (
    auth.uid() = user_id or
    auth.jwt()->>'email' = guest_email
  );

create policy "orders_admin_all" on public.orders
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- ORDER_ITEMS: Inherit from parent order
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.order_items.order_id
      and (
        auth.uid() = public.orders.user_id or
        auth.jwt()->>'email' = public.orders.guest_email or
        exists (
          select 1 from auth.users
          where auth.users.id = auth.uid()
          and auth.users.email like '%@admin.%'
        )
      )
    )
  );

create policy "order_items_admin_all" on public.order_items
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- ADMIN_AUDIT_LOGS: Only admins can view and create
create policy "audit_logs_admin_select" on public.admin_audit_logs
  for select using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

create policy "audit_logs_admin_insert" on public.admin_audit_logs
  for insert with check (
    auth.uid() = admin_id and
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- Grant appropriate permissions
grant usage on schema public to authenticated, anon;
grant select on public.products to authenticated, anon;
grant select on public.product_variants to authenticated, anon;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert on public.orders to authenticated, anon;
grant update on public.orders to authenticated;
grant select on public.order_items to authenticated;
