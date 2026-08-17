-- ============================================================================
-- FIX MIGRATION: Add bundles tables + fix RLS policy
-- Run this in Supabase Dashboard > SQL Editor AFTER the combined migration
-- ============================================================================

-- 1. CREATE BUNDLES TABLE
CREATE TABLE IF NOT EXISTS public.bundles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  bundle_price     NUMERIC(10,2) NOT NULL CHECK (bundle_price > 0),
  regular_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  active_from      TIMESTAMPTZ,
  active_to        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CREATE BUNDLE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id   UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bundle_items_bundle_id ON public.bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_product_id ON public.bundle_items(product_id);

-- 3. ENABLE RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR BUNDLES
CREATE POLICY bundles_public_read ON public.bundles
  FOR SELECT USING (is_active = true OR (auth.jwt()->>'email') LIKE '%@admin.%');

CREATE POLICY bundles_admin_insert ON public.bundles
  FOR INSERT WITH CHECK ((auth.jwt()->>'email') LIKE '%@admin.%');

CREATE POLICY bundles_admin_update ON public.bundles
  FOR UPDATE USING ((auth.jwt()->>'email') LIKE '%@admin.%')
  WITH CHECK ((auth.jwt()->>'email') LIKE '%@admin.%');

CREATE POLICY bundles_admin_delete ON public.bundles
  FOR DELETE USING ((auth.jwt()->>'email') LIKE '%@admin.%');

-- 5. RLS POLICIES FOR BUNDLE ITEMS
CREATE POLICY bundle_items_public_read ON public.bundle_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bundles WHERE id = bundle_items.bundle_id AND is_active = true)
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

CREATE POLICY bundle_items_admin_insert ON public.bundle_items
  FOR INSERT WITH CHECK ((auth.jwt()->>'email') LIKE '%@admin.%');

CREATE POLICY bundle_items_admin_delete ON public.bundle_items
  FOR DELETE USING ((auth.jwt()->>'email') LIKE '%@admin.%');

-- 6. GRANTS
GRANT SELECT ON public.bundles TO authenticated, anon;
GRANT SELECT ON public.bundle_items TO authenticated, anon;

-- ============================================================================
-- 7. FIX: Drop and recreate all policies that use auth.users subqueries
--    auth.users is not accessible by anon/authenticated roles
-- ============================================================================

-- products_public_read
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT USING (is_active = true OR (auth.jwt()->>'email') LIKE '%@admin.%');

-- product_variants_public_read
DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND is_active = true)
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- product_images_public_read
DROP POLICY IF EXISTS product_images_public_read ON public.product_images;
CREATE POLICY product_images_public_read ON public.product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products WHERE id = product_images.product_id AND is_active = true)
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- product_inventory_public_read
DROP POLICY IF EXISTS product_inventory_public_read ON public.product_inventory;
CREATE POLICY product_inventory_public_read ON public.product_inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products WHERE id = product_inventory.product_id AND is_active = true)
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- orders_user_select
DROP POLICY IF EXISTS orders_user_select ON public.orders;
CREATE POLICY orders_user_select ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id OR auth.jwt()->>'email' = guest_email
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- refunds_user_select
DROP POLICY IF EXISTS refunds_user_select ON public.refunds;
CREATE POLICY refunds_user_select ON public.refunds
  FOR SELECT USING (
    requested_by = auth.uid()
    OR (requested_by IS NULL AND order_id IN (SELECT id FROM public.orders WHERE guest_email = auth.jwt()->>'email'))
    OR order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR (auth.jwt()->>'email') LIKE '%@admin.%'
  );

-- ============================================================================
-- END OF FIX MIGRATION
-- ============================================================================
