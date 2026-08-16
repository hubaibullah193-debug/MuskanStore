-- 005_create_users_table.sql
-- Users profile table for customer information

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  email_verified boolean default false,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can read their own profile and see public admin info
create policy "users_read_own" on public.users
  for select using (
    auth.uid() = id or
    role = 'admin'
  );

-- Users can update their own profile
create policy "users_update_own" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can read and manage all users
create policy "users_admin_all" on public.users
  for all using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email like '%@admin.%'
    )
  );

-- Grants
grant select on public.users to authenticated;
grant update on public.users to authenticated;
