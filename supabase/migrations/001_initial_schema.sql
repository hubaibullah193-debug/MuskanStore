-- 001_initial_schema.sql
-- Initial schema for mstore: products, cart, orders, and audit logging

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  base_price numeric(10, 2) not null,
  stock_quantity integer not null default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Product variants (size, color, etc.)
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  variant_name text not null,
  price_adjustment numeric(10, 2) default 0,
  stock_quantity integer not null default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Shopping cart
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_email text,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1,
  price numeric(10, 2) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint cart_owner check (
    (user_id is not null and guest_email is null) or
    (user_id is null and guest_email is not null)
  )
);

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  order_number text not null unique,
  order_status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text,
  payment_reference text,
  items jsonb not null,
  subtotal numeric(10, 2) not null,
  tax numeric(10, 2) default 0,
  shipping_fee numeric(10, 2) default 0,
  total_amount numeric(10, 2) not null,
  shipping_address jsonb,
  billing_address jsonb,
  status_history jsonb default '[]',
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Order items (detailed line items)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null,
  created_at timestamp with time zone default now()
);

-- Admin audit log
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_products_slug on public.products(slug);
create index idx_products_is_active on public.products(is_active);
create index idx_product_variants_product_id on public.product_variants(product_id);
create index idx_product_variants_sku on public.product_variants(sku);
create index idx_cart_items_user_id on public.cart_items(user_id);
create index idx_cart_items_guest_email on public.cart_items(guest_email);
create index idx_cart_items_product_id on public.cart_items(product_id);
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_guest_email on public.orders(guest_email);
create index idx_orders_order_number on public.orders(order_number);
create index idx_orders_order_status on public.orders(order_status);
create index idx_orders_payment_status on public.orders(payment_status);
create index idx_orders_created_at on public.orders(created_at);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_admin_audit_logs_admin_id on public.admin_audit_logs(admin_id);
create index idx_admin_audit_logs_entity_type on public.admin_audit_logs(entity_type);
create index idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at);

-- Enable realtime for certain tables
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
