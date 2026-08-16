-- 011_webhook_email_tracking.sql
-- Track webhook-triggered emails to prevent duplicates from webhook retries
-- Deduplicates payment status, order confirmation, and other webhook-driven emails

create table public.webhook_email_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  transaction_id text not null,
  payment_gateway text not null, -- 'jazz_cash', 'easypaisa'
  email_type text not null, -- 'payment_status', 'order_confirmation', etc.
  webhook_hash text not null, -- SHA256 hash of webhook payload for exact duplicate detection
  sent_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),

  -- Unique constraint: same order + gateway + transaction + email type + payload = don't send again
  constraint webhook_email_unique unique (order_id, transaction_id, payment_gateway, email_type, webhook_hash)
);

-- Indexes for efficient lookups
create index idx_webhook_email_tracking_order_id on public.webhook_email_tracking(order_id);
create index idx_webhook_email_tracking_transaction on public.webhook_email_tracking(transaction_id, payment_gateway);
create index idx_webhook_email_tracking_email_type on public.webhook_email_tracking(email_type);
create index idx_webhook_email_tracking_created_at on public.webhook_email_tracking(created_at);

-- RLS: Admin/service role access only
alter table public.webhook_email_tracking enable row level security;

create policy "Service role can manage webhook email tracking"
  on public.webhook_email_tracking
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
