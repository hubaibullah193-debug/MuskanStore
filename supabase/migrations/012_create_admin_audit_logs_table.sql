-- 012_create_admin_audit_logs_table.sql
-- Admin audit log table for tracking admin actions

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  changes jsonb default null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.admin_audit_logs enable row level security;

-- Admins can read all audit logs
create policy "admin_audit_logs_read_admin" on public.admin_audit_logs
  for select using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- Service role can insert (used by server actions)
grant insert on public.admin_audit_logs to service_role;
grant select on public.admin_audit_logs to authenticated;

comment on table public.admin_audit_logs is 'Audit log for admin actions (order edits, refunds, shipments, etc.)';