-- ============================================================================
-- 014_unify_admin_rls_role.sql
-- Unify admin authorization: RLS policies must agree with the application,
-- which identifies admins via public.users.role = 'admin'
-- (see lib/auth/admin.ts isAdmin(), middleware.ts, contact_messages migration).
--
-- Previously RLS used `auth.users.email LIKE '%@admin.%'` (or the JWT email
-- claim). That was a brittle workaround for the 42501 "no SELECT on auth.users"
-- error and disagreed with the app's role-column check, creating a mismatch
-- where a user could be admin in the app but denied by RLS (or vice versa).
--
-- Fix: a SECURITY DEFINER helper `public.is_admin()` reads public.users.role
-- for the current user (bypassing RLS + the auth.users permission problem),
-- and every admin policy now delegates to it.
-- ============================================================================

-- 1. Canonical admin check ---------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon, service_role;

-- 1b. Collapse legacy catch-all admin policies (from 002_rls_policies.sql)
--     that were never overridden by 001_fix and still gate on the @admin.
--     email suffix. Admin access is now exclusively role-based via is_admin().
drop policy if exists products_admin_all on public.products;
drop policy if exists product_variants_admin_all on public.product_variants;

-- 2. CATEGORIES --------------------------------------------------------------
drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories
  for insert with check (public.is_admin());

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories
  for delete using (public.is_admin());

-- 3. USERS -------------------------------------------------------------------
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin());

-- 4. PRODUCTS ----------------------------------------------------------------
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (
    is_active = true
    or public.is_admin()
  );

drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- 5. PRODUCT VARIANTS --------------------------------------------------------
drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select using (
    exists (
      select 1 from public.products
      where id = product_variants.product_id and is_active = true
    )
    or public.is_admin()
  );

drop policy if exists product_variants_admin_insert on public.product_variants;
create policy product_variants_admin_insert on public.product_variants
  for insert with check (public.is_admin());

drop policy if exists product_variants_admin_update on public.product_variants;
create policy product_variants_admin_update on public.product_variants
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_variants_admin_delete on public.product_variants;
create policy product_variants_admin_delete on public.product_variants
  for delete using (public.is_admin());

-- 6. PRODUCT IMAGES ----------------------------------------------------------
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products
      where id = product_images.product_id and is_active = true
    )
    or public.is_admin()
  );

drop policy if exists product_images_admin_insert on public.product_images;
create policy product_images_admin_insert on public.product_images
  for insert with check (public.is_admin());

drop policy if exists product_images_admin_delete on public.product_images;
create policy product_images_admin_delete on public.product_images
  for delete using (public.is_admin());

-- 7. PRODUCT INVENTORY -------------------------------------------------------
drop policy if exists product_inventory_public_read on public.product_inventory;
create policy product_inventory_public_read on public.product_inventory
  for select using (
    exists (
      select 1 from public.products
      where id = product_inventory.product_id and is_active = true
    )
    or public.is_admin()
  );

drop policy if exists product_inventory_admin_insert on public.product_inventory;
create policy product_inventory_admin_insert on public.product_inventory
  for insert with check (public.is_admin());

drop policy if exists product_inventory_admin_update on public.product_inventory;
create policy product_inventory_admin_update on public.product_inventory
  for update using (public.is_admin()) with check (public.is_admin());

-- 8. ORDERS ------------------------------------------------------------------
drop policy if exists orders_user_select on public.orders;
create policy orders_user_select on public.orders
  for select using (
    auth.uid() = user_id
    or auth.jwt()->>'email' = guest_email
    or public.is_admin()
  );

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all using (public.is_admin());

-- 9. ORDER ITEMS (inherited from parent order + admin) -----------------------
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders
      where public.orders.id = public.order_items.order_id
      and (
        auth.uid() = public.orders.user_id
        or auth.jwt()->>'email' = public.orders.guest_email
        or public.is_admin()
      )
    )
  );

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all using (public.is_admin());

-- 10. PAYMENT ATTEMPTS -------------------------------------------------------
drop policy if exists payment_attempts_admin_select on public.payment_attempts;
create policy payment_attempts_admin_select on public.payment_attempts
  for select using (public.is_admin());

-- 11. INVENTORY RESERVATIONS + WEBHOOK PROCESSING ----------------------------
drop policy if exists inventory_reservations_service_role on public.inventory_reservations;
drop policy if exists inventory_reservations_admin_all on public.inventory_reservations;
create policy inventory_reservations_admin_all on public.inventory_reservations
  for all using (public.is_admin());

drop policy if exists webhook_processing_service_role on public.webhook_processing;
create policy webhook_processing_admin_all on public.webhook_processing
  for all using (public.is_admin());

-- 12. SHIPMENTS --------------------------------------------------------------
drop policy if exists shipments_admin_all on public.shipments;
create policy shipments_admin_all on public.shipments
  for all using (public.is_admin());

-- 13. REFUNDS ----------------------------------------------------------------
drop policy if exists refunds_user_select on public.refunds;
create policy refunds_user_select on public.refunds
  for select using (
    requested_by = auth.uid()
    or (
      requested_by is null
      and order_id in (
        select id from public.orders where guest_email = auth.jwt()->>'email'
      )
    )
    or order_id in (
      select id from public.orders where user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists refunds_admin_all on public.refunds;
create policy refunds_admin_all on public.refunds
  for all using (public.is_admin());

-- 14. ADMIN AUDIT LOGS (collapse the duplicate read/insert policies) ----------
drop policy if exists audit_logs_admin_select on public.admin_audit_logs;
drop policy if exists admin_audit_logs_read_admin on public.admin_audit_logs;
drop policy if exists admin_audit_logs_admin_select on public.admin_audit_logs;
create policy admin_audit_logs_admin_select on public.admin_audit_logs
  for select using (public.is_admin());

drop policy if exists audit_logs_admin_insert on public.admin_audit_logs;
create policy admin_audit_logs_admin_insert on public.admin_audit_logs
  for insert with check (
    auth.uid() = admin_id
    and public.is_admin()
  );

-- 15. AUDIT LOGS (separate table) --------------------------------------------
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
  for select using (public.is_admin());

-- 16. SETTINGS ---------------------------------------------------------------
drop policy if exists settings_admin_insert on public.settings;
create policy settings_admin_insert on public.settings
  for insert with check (public.is_admin());

drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- 17. SERVICE AREAS ----------------------------------------------------------
drop policy if exists service_areas_admin_insert on public.service_areas;
create policy service_areas_admin_insert on public.service_areas
  for insert with check (public.is_admin());

drop policy if exists service_areas_admin_update on public.service_areas;
create policy service_areas_admin_update on public.service_areas
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists service_areas_admin_delete on public.service_areas;
create policy service_areas_admin_delete on public.service_areas
  for delete using (public.is_admin());

-- 18. BUNDLES ----------------------------------------------------------------
drop policy if exists bundles_admin_all on public.bundles;
create policy bundles_admin_all on public.bundles
  for all using (public.is_admin());

-- 19. BUNDLE ITEMS -----------------------------------------------------------
drop policy if exists bundle_items_admin_all on public.bundle_items;
create policy bundle_items_admin_all on public.bundle_items
  for all using (public.is_admin());

-- ============================================================================
-- GRANTS (preserve write paths; service_role already has ALL)
-- These mirror the grants that lived in the now-removed 002_rls_policies.sql
-- so guest (anon) checkout and customer order/refund access keep working.
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.orders      TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.refunds     TO authenticated, anon;
GRANT SELECT                  ON public.order_items TO authenticated, anon;
GRANT UPDATE                  ON public.orders      TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
