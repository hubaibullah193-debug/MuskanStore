-- ============================================================================
-- 001_fix_rls_use_auth_jwt.sql
-- Fix systemic RLS bug: replace auth.users subqueries with auth.jwt() claims
-- Problem: anon/authenticated roles have no SELECT on auth.users,
--          causing 42501 on every table with an auth.users admin-check policy.
-- Fix: Use (auth.jwt()->>'email') LIKE '%@admin.%' which reads from the JWT
--      claims without requiring table access.
-- ============================================================================

-- ============================================================================
-- 1. USERS
-- ============================================================================

DROP POLICY IF EXISTS users_admin_all ON public.users;
CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 2. CATEGORIES
-- ============================================================================

DROP POLICY IF EXISTS categories_admin_insert ON public.categories;
CREATE POLICY categories_admin_insert ON public.categories
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS categories_admin_update ON public.categories;
CREATE POLICY categories_admin_update ON public.categories
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS categories_admin_delete ON public.categories;
CREATE POLICY categories_admin_delete ON public.categories
  FOR DELETE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 3. PRODUCTS
-- ============================================================================

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT USING (
    is_active = true
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS products_admin_insert ON public.products;
CREATE POLICY products_admin_insert ON public.products
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS products_admin_update ON public.products;
CREATE POLICY products_admin_update ON public.products
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_admin_delete ON public.products
  FOR DELETE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 4. PRODUCT VARIANTS
-- ============================================================================

DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_variants.product_id AND is_active = true
    )
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_variants_admin_insert ON public.product_variants;
CREATE POLICY product_variants_admin_insert ON public.product_variants
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_variants_admin_update ON public.product_variants;
CREATE POLICY product_variants_admin_update ON public.product_variants
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_variants_admin_delete ON public.product_variants;
CREATE POLICY product_variants_admin_delete ON public.product_variants
  FOR DELETE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 5. PRODUCT IMAGES
-- ============================================================================

DROP POLICY IF EXISTS product_images_public_read ON public.product_images;
CREATE POLICY product_images_public_read ON public.product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_images.product_id AND is_active = true
    )
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_images_admin_insert ON public.product_images;
CREATE POLICY product_images_admin_insert ON public.product_images
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_images_admin_delete ON public.product_images;
CREATE POLICY product_images_admin_delete ON public.product_images
  FOR DELETE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 6. PRODUCT INVENTORY
-- ============================================================================

DROP POLICY IF EXISTS product_inventory_public_read ON public.product_inventory;
CREATE POLICY product_inventory_public_read ON public.product_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_inventory.product_id AND is_active = true
    )
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_inventory_admin_insert ON public.product_inventory;
CREATE POLICY product_inventory_admin_insert ON public.product_inventory
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS product_inventory_admin_update ON public.product_inventory;
CREATE POLICY product_inventory_admin_update ON public.product_inventory
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 7. ORDERS
-- ============================================================================

DROP POLICY IF EXISTS orders_user_select ON public.orders;
CREATE POLICY orders_user_select ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS orders_admin_all ON public.orders;
CREATE POLICY orders_admin_all ON public.orders
  FOR ALL USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 8. PAYMENT ATTEMPTS
-- ============================================================================

DROP POLICY IF EXISTS payment_attempts_admin_select ON public.payment_attempts;
CREATE POLICY payment_attempts_admin_select ON public.payment_attempts
  FOR SELECT USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 9. INVENTORY RESERVATIONS
-- ============================================================================

DROP POLICY IF EXISTS inventory_reservations_admin_all ON public.inventory_reservations;
CREATE POLICY inventory_reservations_admin_all ON public.inventory_reservations
  FOR ALL USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 10. SHIPMENTS
-- ============================================================================

DROP POLICY IF EXISTS shipments_admin_all ON public.shipments;
CREATE POLICY shipments_admin_all ON public.shipments
  FOR ALL USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 11. REFUNDS
-- ============================================================================

DROP POLICY IF EXISTS refunds_user_select ON public.refunds;
CREATE POLICY refunds_user_select ON public.refunds
  FOR SELECT USING (
    requested_by = auth.uid()
    OR (requested_by IS NULL AND order_id IN (
      SELECT id FROM public.orders WHERE guest_email = auth.jwt()->>'email'
    ))
    OR order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS refunds_admin_all ON public.refunds;
CREATE POLICY refunds_admin_all ON public.refunds
  FOR ALL USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 12. ADMIN AUDIT LOGS
-- ============================================================================

DROP POLICY IF EXISTS admin_audit_logs_admin_select ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_select ON public.admin_audit_logs
  FOR SELECT USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 13. AUDIT LOGS
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 14. SETTINGS
-- ============================================================================

DROP POLICY IF EXISTS settings_admin_insert ON public.settings;
CREATE POLICY settings_admin_insert ON public.settings
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS settings_admin_update ON public.settings;
CREATE POLICY settings_admin_update ON public.settings
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- 15. SERVICE AREAS
-- ============================================================================

DROP POLICY IF EXISTS service_areas_admin_insert ON public.service_areas;
CREATE POLICY service_areas_admin_insert ON public.service_areas
  FOR INSERT WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS service_areas_admin_update ON public.service_areas;
CREATE POLICY service_areas_admin_update ON public.service_areas
  FOR UPDATE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  ) WITH CHECK (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

DROP POLICY IF EXISTS service_areas_admin_delete ON public.service_areas;
CREATE POLICY service_areas_admin_delete ON public.service_areas
  FOR DELETE USING (
    (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- END OF FIX
-- ============================================================================
