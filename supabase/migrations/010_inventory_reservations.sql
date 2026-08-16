-- 010_inventory_reservations.sql
-- Inventory reservation system with TTL for payment synchronization
-- Prevents overselling and ensures inventory is only finalized after verified payment

-- Inventory reservations table (temporary holds during checkout)
create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null,
  status text not null default 'reserved', -- reserved, finalized, released, expired
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null, -- 30 minutes from creation
  finalized_at timestamp with time zone,
  released_at timestamp with time zone,
  constraint valid_quantity check (quantity > 0)
);

-- Payment webhook deduplication table (prevent duplicate processing)
create table public.webhook_processing (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  transaction_id text not null,
  payment_gateway text not null, -- 'jazz_cash' or 'easypaisa'
  webhook_hash text not null, -- Hash of webhook payload for idempotency
  processed_at timestamp with time zone default now(),
  status text not null default 'processed', -- processed, duplicate
  constraint unique_transaction_per_order unique (order_id, transaction_id, payment_gateway)
);

-- Indexes for performance
create index idx_inventory_reservations_order_id on public.inventory_reservations(order_id);
create index idx_inventory_reservations_product_id on public.inventory_reservations(product_id);
create index idx_inventory_reservations_status on public.inventory_reservations(status);
create index idx_inventory_reservations_expires_at on public.inventory_reservations(expires_at);
create index idx_webhook_processing_order_id on public.webhook_processing(order_id);
create index idx_webhook_processing_transaction_id on public.webhook_processing(transaction_id);

-- Enable RLS
alter table public.inventory_reservations enable row level security;
alter table public.webhook_processing enable row level security;

-- RLS Policies
-- Reservations are internal system tables, read/write via service role only
create policy "inventory_reservations_service_role" on public.inventory_reservations
  for all using (
    (select current_setting('role')) = 'authenticated' and
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

create policy "webhook_processing_service_role" on public.webhook_processing
  for all using (
    (select current_setting('role')) = 'authenticated' and
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );
