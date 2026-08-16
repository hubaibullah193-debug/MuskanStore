-- 008_create_refunds_table.sql
-- Refund request and processing workflow

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null, -- null for guest requests
  admin_id uuid references auth.users(id) on delete set null,
  status text not null default 'requested', -- 'requested', 'approved', 'rejected', 'completed'
  refund_amount numeric(10, 2) not null,
  reason text not null,
  admin_notes text,
  rejection_reason text,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for efficient lookups
create index idx_refunds_order_id on public.refunds(order_id);
create index idx_refunds_status on public.refunds(status);
create index idx_refunds_requested_by on public.refunds(requested_by);
create index idx_refunds_admin_id on public.refunds(admin_id);
create index idx_refunds_created_at on public.refunds(created_at);

-- RLS: Users can view their own refund requests
alter table public.refunds enable row level security;

create policy "Users can view their own refund requests"
  on public.refunds for select
  using (
    requested_by = auth.uid()
    or (requested_by is null and order_id in (
      select id from public.orders where guest_email = auth.jwt()->>'email'
    ))
    or order_id in (
      select id from public.orders where user_id = auth.uid()
    )
  );

-- Users can create refund requests
create policy "Users can create refund requests"
  on public.refunds for insert
  with check (
    (requested_by = auth.uid() and order_id in (
      select id from public.orders where user_id = auth.uid()
    ))
  );

-- Admins can view, update, and manage all refunds
create policy "Admins can manage all refunds"
  on public.refunds
  using (
    exists (
      select 1 from public.admin_audit_logs
      where admin_id = auth.uid()
      limit 1
    )
  )
  with check (
    exists (
      select 1 from public.admin_audit_logs
      where admin_id = auth.uid()
      limit 1
    )
  );

-- Service role can manage refunds
create policy "Service role can manage all refunds"
  on public.refunds
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
