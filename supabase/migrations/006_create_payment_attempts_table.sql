-- 006_create_payment_attempts_table.sql
-- Payment attempts tracking for webhook verification and retry logic

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  attempt_number integer not null,
  gateway_response_code text,
  error_reason text,
  is_counted_failure boolean default false,
  attempted_at timestamp with time zone default now()
);

-- Indexes for efficient lookups
create index idx_payment_attempts_order_id on public.payment_attempts(order_id);
create index idx_payment_attempts_attempted_at on public.payment_attempts(attempted_at);
create index idx_payment_attempts_is_counted_failure on public.payment_attempts(is_counted_failure);
