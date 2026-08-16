-- 007_create_email_logs_table.sql
-- Email delivery tracking and audit log

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  email_type text not null, -- 'order_confirmation', 'payment_status', 'password_reset', etc.
  status text not null default 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  reference_id uuid, -- order_id, user_id, etc.
  reference_type text, -- 'order', 'user', etc.
  message_id text, -- Message ID from email provider (Resend, SendGrid, etc.)
  error_message text,
  retry_count integer default 0,
  max_retries integer default 3,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  sent_at timestamp with time zone
);

-- Indexes for efficient lookups
create index idx_email_logs_recipient_email on public.email_logs(recipient_email);
create index idx_email_logs_email_type on public.email_logs(email_type);
create index idx_email_logs_status on public.email_logs(status);
create index idx_email_logs_reference on public.email_logs(reference_id, reference_type);
create index idx_email_logs_created_at on public.email_logs(created_at);

-- RLS: Users can view their own email logs
alter table public.email_logs enable row level security;

create policy "Users can view their own email logs"
  on public.email_logs for select
  using (
    reference_type = 'user' and reference_id = auth.uid()
    or reference_type = 'order' and reference_id in (
      select id from public.orders where user_id = auth.uid()
    )
  );

-- Allow service role to manage email logs
create policy "Service role can manage all email logs"
  on public.email_logs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
