-- Add idempotency_key to orders for safe retry / double-submit protection.
-- A client-generated key lets a retried checkout return the original order
-- instead of creating a duplicate (with duplicate inventory + confirmation email).

alter table public.orders
  add column if not exists idempotency_key text;

-- Enforce uniqueness for non-null keys only.
-- Postgres allows many NULLs, so this does not conflict with legacy rows.
create unique index if not exists idx_orders_idempotency_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;
