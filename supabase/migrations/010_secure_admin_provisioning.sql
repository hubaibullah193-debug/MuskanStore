-- ============================================================================
-- 009_secure_admin_provisioning.sql
-- Secure admin provisioning + prevent customers from self-escalating role.
--
-- Design goals (see docs/ADMIN_PROVISIONING.md):
--   * Signup always creates role='customer' (enforced in the app auth actions),
--     so there is NO public admin signup and customers cannot pick a role.
--   * The initial admin (and any further admin) is designated by a PRIVILEGED
--     operator via public.provision_admin(email). It is callable only with the
--     service_role key or from the Supabase dashboard (postgres). EXECUTE is
--     revoked from anon/authenticated so a raw client can never promote anyone,
--     even during the initial bootstrap window.
--   * Authorization inside provision_admin():
--       - Initial bootstrap (zero admins exist): allowed for any caller with
--         direct DB access (dashboard / service_role key).
--       - Afterwards: allowed only for an existing admin or the service_role key.
--   * RLS prevents a non-admin (authenticated/anon client) from changing their
--     own `role` column, closing the self-escalation vector on users_update_own.
--   * service_role / dashboard connections bypass RLS, so the bootstrap path is
--     never blocked by these policies.
-- ============================================================================

-- 1. Helper: is the proposed new role identical to the caller's CURRENT role?
--    SECURITY DEFINER so the lookup bypasses RLS (no policy recursion). Used by
--    the self-update policy to forbid changing `role` while allowing other
--    profile fields to be edited.
create or replace function public.own_role_unchanged(p_new_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role from public.users where id = auth.uid()), 'customer') = p_new_role;
$$;

grant execute on function public.own_role_unchanged(text) to authenticated, anon;

-- 2. Tighten self-update: a user may edit their own row but NOT change `role`.
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and public.own_role_unchanged(role)
  );

-- 3. Admin policy also needs a WITH CHECK so an admin using the authenticated
--    client can update rows (including `role`).
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Secure admin provisioning function (SECURITY DEFINER; bypasses RLS).
create or replace function public.provision_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid;
  v_admin_count  integer;
  v_bootstrap    boolean;
begin
  select count(*) into v_admin_count from public.users where role = 'admin';
  v_bootstrap := (v_admin_count = 0);

  -- Authorization:
  --  * Initial bootstrap (no admins yet): allowed for any caller with direct
  --    DB access (dashboard SQL editor or service_role key).
  --  * After that: only an existing admin or the service_role key may promote.
  if not v_bootstrap then
    if auth.role() = 'service_role' or public.is_admin() then
      -- authorized
    else
      raise exception 'Only an existing admin can provision additional admins';
    end if;
  end if;

  select id into v_uid from public.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'No user found with email %', p_email;
  end if;

  update public.users
     set role = 'admin', updated_at = now()
   where id = v_uid;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, changes)
  values (
    coalesce(auth.uid(), v_uid),
    'provision_admin',
    'user',
    v_uid,
    jsonb_build_object(
      'email', p_email,
      'bootstrap', v_bootstrap,
      'promoted_by', coalesce(auth.uid()::text, 'service_role')
    )
  );
end;
$$;

-- Only the service_role key (used by scripts/tooling) and the function owner
-- (postgres, i.e. the Supabase dashboard) may execute this. EXECUTE is revoked
-- from PUBLIC so anon/authenticated clients cannot call it - this blocks a
-- self-promotion attempt even during the initial bootstrap window.
revoke execute on function public.provision_admin(text) from public;
grant execute on function public.provision_admin(text) to service_role;
