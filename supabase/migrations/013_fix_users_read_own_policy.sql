-- ============================================================================
-- 013_fix_users_read_own_policy.sql
-- Security hardening: remove the `OR role = 'admin'` clause from users_read_own.
--
-- Root cause: migration 000 defined users_read_own as
--   CREATE POLICY users_read_own ON public.users
--     FOR SELECT USING (auth.uid() = id OR role = 'admin');
-- and migration 000 also GRANTs SELECT ON public.users TO authenticated.
-- Together these let ANY authenticated user read every admin profile row
-- (id, email, name, phone) — an information leak. (auth.uid() = id already
-- scopes a user to their own row; admins retain full read via users_admin_all,
-- which is FOR ALL USING public.is_admin(). The `role = 'admin'` clause was
-- redundant and insecure.)
--
-- Fix: users may SELECT only their own row. Admin read access is unchanged
-- (delegated to is_admin() via users_admin_all).
-- ============================================================================

DROP POLICY IF EXISTS users_read_own ON public.users;

CREATE POLICY users_read_own ON public.users
  FOR SELECT USING (auth.uid() = id);
