-- 009_auto_create_user_profile.sql
-- Auto-create a public.users profile for every new Supabase auth user.
--
-- Root cause context: login (app/auth/actions.ts) required a public.users row
-- and failed for any account created outside the app's signup form (Supabase
-- dashboard, OAuth, magic link, diagnostic tools). 22/25 existing auth users
-- had no profile row, so valid credentials still could not log in.
--
-- This trigger makes profile creation automatic for ALL new auth users,
-- preventing recurrence. It is idempotent (on conflict do nothing) so it is
-- safe alongside app/signUpAction's explicit insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, phone, role, email_verified)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.phone,
    'customer',
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
