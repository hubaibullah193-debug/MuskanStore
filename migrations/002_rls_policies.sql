-- Step 2: Row-Level Security (RLS) Policies
-- Muskan Care Center E-Commerce Store
-- Created: 2026-08-16
-- Security Model: Default-deny on all tables, then specific policies grant access per role

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- CATEGORIES: Public read, admin write
-- ===================================================================
CREATE POLICY categories_public_read ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin_write ON categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY categories_admin_update ON categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY categories_admin_delete ON categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- PRODUCTS: Public read active products, admin full access
-- ===================================================================
CREATE POLICY products_public_read ON products FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY products_admin_write ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY products_admin_update ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY products_admin_delete ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- VARIANTS: Public read (active products only), admin write
-- ===================================================================
CREATE POLICY variants_public_read ON variants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = variants.product_id AND is_active = true
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY variants_admin_write ON variants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY variants_admin_update ON variants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY variants_admin_delete ON variants FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- PRODUCT IMAGES: Public read (active products only), admin write
-- ===================================================================
CREATE POLICY product_images_public_read ON product_images FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_images.product_id AND is_active = true
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY product_images_admin_write ON product_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY product_images_admin_delete ON product_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- PRODUCT INVENTORY: Public read (active products only), admin write
-- ===================================================================
CREATE POLICY product_inventory_public_read ON product_inventory FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE id = product_inventory.product_id AND is_active = true
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY product_inventory_admin_write ON product_inventory FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY product_inventory_admin_update ON product_inventory FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- BUNDLES: Public read (active, temporal), admin write
-- ===================================================================
CREATE POLICY bundles_public_read ON bundles FOR SELECT USING (
  is_active = true
  AND (active_from IS NULL OR active_from <= CURRENT_TIMESTAMP)
  AND (active_to IS NULL OR active_to >= CURRENT_TIMESTAMP)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundles_admin_write ON bundles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundles_admin_update ON bundles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundles_admin_delete ON bundles FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- BUNDLE ITEMS: Public read (via bundle), admin write
-- ===================================================================
CREATE POLICY bundle_items_public_read ON bundle_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bundles
    WHERE id = bundle_items.bundle_id
    AND is_active = true
    AND (active_from IS NULL OR active_from <= CURRENT_TIMESTAMP)
    AND (active_to IS NULL OR active_to >= CURRENT_TIMESTAMP)
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundle_items_admin_write ON bundle_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundle_items_admin_update ON bundle_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY bundle_items_admin_delete ON bundle_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- CARTS: Customer owns own cart, admin can view all
-- ===================================================================
CREATE POLICY carts_customer_read ON carts FOR SELECT USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND guest_email = current_setting('request.headers')::json->>'x-guest-email')
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY carts_customer_insert ON carts FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);
CREATE POLICY carts_customer_update ON carts FOR UPDATE USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND guest_email = current_setting('request.headers')::json->>'x-guest-email')
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  user_id = auth.uid()
  OR (user_id IS NULL AND guest_email = current_setting('request.headers')::json->>'x-guest-email')
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY carts_customer_delete ON carts FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- ORDERS: Customer owns own orders, guest via token, admin full access
-- ===================================================================
CREATE POLICY orders_customer_read ON orders FOR SELECT USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND guest_email IS NOT NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY orders_customer_insert ON orders FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);
CREATE POLICY orders_customer_update ON orders FOR UPDATE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  OR user_id IS NULL
) WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  OR user_id IS NULL
);
CREATE POLICY orders_admin_delete ON orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- PAYMENT ATTEMPTS: Customer can read own orders' attempts, admin full
-- ===================================================================
CREATE POLICY payment_attempts_customer_read ON payment_attempts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = payment_attempts.order_id AND (
      user_id = auth.uid() OR user_id IS NULL
    )
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY payment_attempts_admin_write ON payment_attempts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM orders
    WHERE id = payment_attempts.order_id AND (
      user_id = auth.uid() OR user_id IS NULL
    )
  )
);

-- ===================================================================
-- SESSIONS: User owns own sessions, admin can view
-- ===================================================================
CREATE POLICY sessions_user_read ON sessions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY sessions_user_insert ON sessions FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY sessions_user_delete ON sessions FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- AUDIT LOGS: Admin only
-- ===================================================================
CREATE POLICY audit_logs_admin_read ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY audit_logs_admin_insert ON audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- SETTINGS: Public read (some), admin write
-- ===================================================================
CREATE POLICY settings_public_read ON settings FOR SELECT USING (true);
CREATE POLICY settings_admin_write ON settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY settings_admin_update ON settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- SERVICE AREAS: Public read, admin write
-- ===================================================================
CREATE POLICY service_areas_public_read ON service_areas FOR SELECT USING (true);
CREATE POLICY service_areas_admin_write ON service_areas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY service_areas_admin_update ON service_areas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- EMAIL LOGS: Admin read, system insert
-- ===================================================================
CREATE POLICY email_logs_admin_read ON email_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY email_logs_system_insert ON email_logs FOR INSERT WITH CHECK (true);

-- ===================================================================
-- USERS: Own profile read/update, admin full access
-- ===================================================================
CREATE POLICY users_own_read ON users FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY users_admin_insert ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY users_own_update ON users FOR UPDATE USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY users_admin_delete ON users FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- USER ADDRESSES: Own addresses, admin full access
-- ===================================================================
CREATE POLICY user_addresses_own_read ON user_addresses FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY user_addresses_own_insert ON user_addresses FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY user_addresses_own_update ON user_addresses FOR UPDATE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY user_addresses_own_delete ON user_addresses FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================================================
-- GRANT EXECUTE on uuid_generate_v4 to authenticated users
-- ===================================================================
GRANT EXECUTE ON FUNCTION uuid_generate_v4() TO authenticated;
