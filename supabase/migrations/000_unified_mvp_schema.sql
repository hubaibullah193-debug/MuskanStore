-- ============================================================================
-- 000_unified_mvp_schema.sql
-- Unified MVP Database Schema for mstore
-- Created: 2026-08-17
-- This migration is self-contained and works against a completely empty
-- Supabase/PostgreSQL database. It supersedes all prior migration sets.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USERS (Supabase Auth integration)
-- ============================================================================

CREATE TABLE public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  phone      TEXT,
  role       TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. CATEGORIES
-- ============================================================================

CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_slug      ON public.categories(slug);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. PRODUCTS
-- ============================================================================

CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL CHECK (base_price > 0),
  sku             TEXT NOT NULL UNIQUE,
  category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  featured        BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_slug        ON public.products(slug);
CREATE INDEX idx_products_is_active   ON public.products(is_active);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_featured    ON public.products(featured) WHERE featured = true;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. PRODUCT VARIANTS
-- ============================================================================

CREATE TABLE public.product_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name     TEXT NOT NULL,
  sku              TEXT NOT NULL UNIQUE,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  stock_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku        ON public.product_variants(sku);

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. PRODUCT IMAGES
-- ============================================================================

CREATE TABLE public.product_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

-- ============================================================================
-- 6. PRODUCT INVENTORY (separate stock tracking with reservations)
-- ============================================================================

CREATE TABLE public.product_inventory (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id           UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity             INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved             INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  low_stock_threshold  INTEGER DEFAULT 5,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, variant_id)
);

CREATE INDEX idx_product_inventory_product_id ON public.product_inventory(product_id);

CREATE TRIGGER product_inventory_updated_at
  BEFORE UPDATE ON public.product_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. CART ITEMS
-- ============================================================================

CREATE TABLE public.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price       NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT cart_owner CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL) OR
    (user_id IS NULL AND guest_email IS NOT NULL)
  )
);

CREATE INDEX idx_cart_items_user_id     ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_guest_email ON public.cart_items(guest_email);
CREATE INDEX idx_cart_items_product_id  ON public.cart_items(product_id);

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. ORDERS
-- ============================================================================

CREATE TABLE public.orders (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number             TEXT NOT NULL UNIQUE,
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email              TEXT,
  guest_token              TEXT UNIQUE,
  guest_token_expires_at   TIMESTAMPTZ,
  items                    JSONB NOT NULL,
  delivery_address         JSONB NOT NULL,
  order_status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN (
      'pending','pending_payment','confirmed','shipped','delivered',
      'cancelled','refund_requested','refunded'
    )),
  payment_method           TEXT NOT NULL
    CHECK (payment_method IN ('cod','jazz_cash','easypaisa')),
  payment_status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('awaiting_cod','pending','paid','failed')),
  total_amount             NUMERIC(10,2) NOT NULL,
  subtotal                 NUMERIC(10,2) NOT NULL,
  tax_amount               NUMERIC(10,2) DEFAULT 0,
  delivery_fee             NUMERIC(10,2) DEFAULT 0,
  payment_fee              NUMERIC(10,2) DEFAULT 0,
  refund_amount            NUMERIC(10,2),
  refund_reason            TEXT,
  payment_reference        TEXT,
  status_history           JSONB DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_user_id       ON public.orders(user_id);
CREATE INDEX idx_orders_guest_email   ON public.orders(guest_email);
CREATE INDEX idx_orders_order_number  ON public.orders(order_number);
CREATE INDEX idx_orders_order_status  ON public.orders(order_status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at    ON public.orders(created_at);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. PAYMENT ATTEMPTS
-- ============================================================================

CREATE TABLE public.payment_attempts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id               UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  attempt_number         INTEGER NOT NULL DEFAULT 1,
  gateway_response_code  TEXT,
  error_reason           TEXT,
  is_counted_failure     BOOLEAN DEFAULT false,
  attempted_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_attempts_order_id       ON public.payment_attempts(order_id);
CREATE INDEX idx_payment_attempts_attempted_at   ON public.payment_attempts(attempted_at);
CREATE INDEX idx_payment_attempts_is_counted     ON public.payment_attempts(is_counted_failure);

-- ============================================================================
-- 10. INVENTORY RESERVATIONS
-- ============================================================================

CREATE TABLE public.inventory_reservations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  status        TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','finalized','released','expired')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  finalized_at  TIMESTAMPTZ,
  released_at   TIMESTAMPTZ
);

CREATE INDEX idx_inventory_reservations_order_id    ON public.inventory_reservations(order_id);
CREATE INDEX idx_inventory_reservations_product_id  ON public.inventory_reservations(product_id);
CREATE INDEX idx_inventory_reservations_status      ON public.inventory_reservations(status);
CREATE INDEX idx_inventory_reservations_expires_at  ON public.inventory_reservations(expires_at);

-- ============================================================================
-- 11. WEBHOOK PROCESSING (deduplication)
-- ============================================================================

CREATE TABLE public.webhook_processing (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id   TEXT NOT NULL,
  payment_gateway  TEXT NOT NULL,
  webhook_hash     TEXT NOT NULL,
  processed_at     TIMESTAMPTZ DEFAULT now(),
  status           TEXT NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processed','duplicate')),
  CONSTRAINT unique_transaction_per_order UNIQUE (order_id, transaction_id, payment_gateway)
);

CREATE INDEX idx_webhook_processing_order_id       ON public.webhook_processing(order_id);
CREATE INDEX idx_webhook_processing_transaction_id ON public.webhook_processing(transaction_id);

-- ============================================================================
-- 12. SHIPMENTS
-- ============================================================================

CREATE TABLE public.shipments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','shipped','delivered','returned','lost')),
  carrier             TEXT NOT NULL DEFAULT 'standard',
  tracking_number     TEXT,
  tracking_url        TEXT,
  estimated_delivery  DATE,
  shipped_date        TIMESTAMPTZ,
  delivered_date      TIMESTAMPTZ,
  weight_kg           NUMERIC(10,2),
  dimensions_cm       TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shipments_order_id    ON public.shipments(order_id);
CREATE INDEX idx_shipments_status      ON public.shipments(status);
CREATE INDEX idx_shipments_created_at  ON public.shipments(created_at);

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 13. REFUNDS
-- ============================================================================

CREATE TABLE public.refunds (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','rejected','completed')),
  refund_amount    NUMERIC(10,2) NOT NULL,
  reason           TEXT NOT NULL,
  admin_notes      TEXT,
  rejection_reason TEXT,
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_refunds_order_id      ON public.refunds(order_id);
CREATE INDEX idx_refunds_status        ON public.refunds(status);
CREATE INDEX idx_refunds_requested_by  ON public.refunds(requested_by);
CREATE INDEX idx_refunds_admin_id      ON public.refunds(admin_id);
CREATE INDEX idx_refunds_created_at    ON public.refunds(created_at);

CREATE TRIGGER refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 14. EMAIL LOGS
-- ============================================================================

CREATE TABLE public.email_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  subject         TEXT NOT NULL,
  email_type      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','bounced')),
  reference_id    UUID,
  reference_type  TEXT,
  message_id      TEXT,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  sent_at         TIMESTAMPTZ
);

CREATE INDEX idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_email_type      ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_status          ON public.email_logs(status);
CREATE INDEX idx_email_logs_reference       ON public.email_logs(reference_id, reference_type);
CREATE INDEX idx_email_logs_created_at      ON public.email_logs(created_at);

CREATE TRIGGER email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 15. ADMIN AUDIT LOGS (primary audit trail for admin actions)
-- ============================================================================

CREATE TABLE public.admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  changes     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_admin_id     ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_entity_type  ON public.admin_audit_logs(entity_type);
CREATE INDEX idx_admin_audit_logs_created_at   ON public.admin_audit_logs(created_at);

-- ============================================================================
-- 16. WEBHOOK EMAIL TRACKING (dedup webhook-triggered emails)
-- ============================================================================

CREATE TABLE public.webhook_email_tracking (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id   TEXT NOT NULL,
  payment_gateway  TEXT NOT NULL,
  email_type       TEXT NOT NULL,
  webhook_hash     TEXT NOT NULL,
  sent_at          TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT webhook_email_unique UNIQUE (
    order_id, transaction_id, payment_gateway, email_type, webhook_hash
  )
);

CREATE INDEX idx_webhook_email_tracking_order_id    ON public.webhook_email_tracking(order_id);
CREATE INDEX idx_webhook_email_tracking_transaction ON public.webhook_email_tracking(transaction_id, payment_gateway);
CREATE INDEX idx_webhook_email_tracking_email_type  ON public.webhook_email_tracking(email_type);
CREATE INDEX idx_webhook_email_tracking_created_at  ON public.webhook_email_tracking(created_at);

-- ============================================================================
-- 17. AUDIT LOGS (secondary audit trail, referenced by admin-inventory/settings)
-- ============================================================================

CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID NOT NULL,
  details       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin_id       ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_resource_type  ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at     ON public.audit_logs(created_at);

-- ============================================================================
-- 18. SETTINGS
-- ============================================================================

CREATE TABLE public.settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 19. SERVICE AREAS
-- ============================================================================

CREATE TABLE public.service_areas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city              TEXT UNIQUE NOT NULL,
  postal_code_range TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER service_areas_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — ENABLE ON EVERY TABLE
-- ============================================================================

ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_processing      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_email_tracking  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas           ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ------------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------------

CREATE POLICY users_read_own ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR role = 'admin'
  );

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------------

CREATE POLICY categories_public_read ON public.categories
  FOR SELECT USING (true);

CREATE POLICY categories_admin_insert ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY categories_admin_update ON public.categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY categories_admin_delete ON public.categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------------

CREATE POLICY products_public_read ON public.products
  FOR SELECT USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY products_admin_insert ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY products_admin_update ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY products_admin_delete ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- PRODUCT VARIANTS
-- ------------------------------------------------------------------

CREATE POLICY product_variants_public_read ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_variants.product_id AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_variants_admin_insert ON public.product_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_variants_admin_update ON public.product_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_variants_admin_delete ON public.product_variants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- PRODUCT IMAGES
-- ------------------------------------------------------------------

CREATE POLICY product_images_public_read ON public.product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_images.product_id AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_images_admin_insert ON public.product_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_images_admin_delete ON public.product_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- PRODUCT INVENTORY
-- ------------------------------------------------------------------

CREATE POLICY product_inventory_public_read ON public.product_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_inventory.product_id AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_inventory_admin_insert ON public.product_inventory
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY product_inventory_admin_update ON public.product_inventory
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- CART ITEMS
-- ------------------------------------------------------------------

CREATE POLICY cart_items_user_select ON public.cart_items
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

CREATE POLICY cart_items_user_insert ON public.cart_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

CREATE POLICY cart_items_user_update ON public.cart_items
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  ) WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

CREATE POLICY cart_items_user_delete ON public.cart_items
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

-- ------------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------------

CREATE POLICY orders_user_select ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY orders_user_insert ON public.orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

CREATE POLICY orders_user_update ON public.orders
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  ) WITH CHECK (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = guest_email
  );

CREATE POLICY orders_admin_all ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- PAYMENT ATTEMPTS (admin only via service role; RLS for safety)
-- ------------------------------------------------------------------

CREATE POLICY payment_attempts_admin_select ON public.payment_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- INVENTORY RESERVATIONS (service role / admin only)
-- ------------------------------------------------------------------

CREATE POLICY inventory_reservations_admin_all ON public.inventory_reservations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- WEBHOOK PROCESSING (service role only)
-- ------------------------------------------------------------------

CREATE POLICY webhook_processing_service_role ON public.webhook_processing
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- SHIPMENTS
-- ------------------------------------------------------------------

CREATE POLICY shipments_user_view ON public.shipments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE user_id = auth.uid() AND user_id IS NOT NULL
    )
  );

CREATE POLICY shipments_guest_view ON public.shipments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE guest_token = current_setting('request.headers')::json->>'x-guest-token'
      AND user_id IS NULL
    )
  );

CREATE POLICY shipments_admin_all ON public.shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- REFUNDS
-- ------------------------------------------------------------------

CREATE POLICY refunds_user_select ON public.refunds
  FOR SELECT USING (
    requested_by = auth.uid()
    OR (requested_by IS NULL AND order_id IN (
      SELECT id FROM public.orders WHERE guest_email = auth.jwt()->>'email'
    ))
    OR order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY refunds_user_insert ON public.refunds
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY refunds_admin_all ON public.refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ------------------------------------------------------------------
-- EMAIL LOGS
-- ------------------------------------------------------------------

CREATE POLICY email_logs_user_select ON public.email_logs
  FOR SELECT USING (
    (reference_type = 'user' AND reference_id = auth.uid())
    OR (reference_type = 'order' AND reference_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY email_logs_service_role ON public.email_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- ADMIN AUDIT LOGS (admin read, service role write)
-- ------------------------------------------------------------------

CREATE POLICY admin_audit_logs_admin_select ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY admin_audit_logs_service_role ON public.admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- WEBHOOK EMAIL TRACKING (service role only)
-- ------------------------------------------------------------------

CREATE POLICY webhook_email_tracking_service_role ON public.webhook_email_tracking
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- AUDIT LOGS (admin read, service role write)
-- ------------------------------------------------------------------

CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY audit_logs_service_role ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- SETTINGS (admin read/write, service role for writes)
-- ------------------------------------------------------------------

CREATE POLICY settings_public_read ON public.settings
  FOR SELECT USING (true);

CREATE POLICY settings_admin_insert ON public.settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY settings_admin_update ON public.settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY settings_service_role ON public.settings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- SERVICE AREAS
-- ------------------------------------------------------------------

CREATE POLICY service_areas_public_read ON public.service_areas
  FOR SELECT USING (true);

CREATE POLICY service_areas_admin_insert ON public.service_areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY service_areas_admin_update ON public.service_areas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY service_areas_admin_delete ON public.service_areas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow authenticated and anon roles to use the public schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Public read access
GRANT SELECT ON public.categories        TO authenticated, anon;
GRANT SELECT ON public.products          TO authenticated, anon;
GRANT SELECT ON public.product_variants  TO authenticated, anon;
GRANT SELECT ON public.product_images    TO authenticated, anon;
GRANT SELECT ON public.settings          TO authenticated, anon;
GRANT SELECT ON public.service_areas     TO authenticated, anon;

-- Authenticated user access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items             TO authenticated;
GRANT SELECT, INSERT ON public.orders                               TO authenticated;
GRANT SELECT, INSERT ON public.refunds                              TO authenticated;
GRANT SELECT ON public.users                                        TO authenticated;
GRANT SELECT ON public.email_logs                                   TO authenticated;

-- Admin (service_role) full access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- REALTIME (enable for order status tracking)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
