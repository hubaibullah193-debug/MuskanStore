-- Step 2: Initial Database Schema
-- Muskan Care Center E-Commerce Store
-- Created: 2026-08-16

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- CATEGORIES TABLE
-- ===================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS 'Product categories with hierarchical support (parent_id for subcategories)';

-- ===================================================================
-- PRODUCTS TABLE
-- ===================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS 'Main products table. Soft-deleted via is_active=false to preserve order history.';
COMMENT ON COLUMN products.sku IS 'Stock keeping unit, must be unique';
COMMENT ON COLUMN products.price IS 'Base price; variants may override';
COMMENT ON COLUMN products.is_active IS 'Soft delete flag: false hides from storefront but keeps order history intact';

-- ===================================================================
-- VARIANTS TABLE
-- ===================================================================
CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku_suffix VARCHAR(50),
  price_override DECIMAL(10, 2) CHECK (price_override IS NULL OR price_override > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE variants IS 'Product variants (e.g., Size S, M, L)';
COMMENT ON COLUMN variants.price_override IS 'If null, use product.price; otherwise use this price';

-- ===================================================================
-- PRODUCT IMAGES TABLE
-- ===================================================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_images IS 'Product images stored in Supabase Storage. First by display_order is main image.';

-- ===================================================================
-- PRODUCT INVENTORY TABLE
-- ===================================================================
CREATE TABLE product_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  low_stock_threshold INT DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, variant_id)
);

COMMENT ON TABLE product_inventory IS 'Stock tracking: quantity=total available, reserved=locked during checkout';
COMMENT ON COLUMN product_inventory.reserved IS 'Units locked by active checkout sessions (expires after 30 min via Redis TTL)';
COMMENT ON COLUMN product_inventory.low_stock_threshold IS 'Per-product override; default 5 units';

-- ===================================================================
-- BUNDLES TABLE
-- ===================================================================
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  bundle_price DECIMAL(10, 2) NOT NULL CHECK (bundle_price > 0),
  regular_price DECIMAL(10, 2) NOT NULL CHECK (regular_price > 0),
  discount_percent DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT TRUE,
  active_from TIMESTAMP WITH TIME ZONE,
  active_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bundles IS 'Bundle offers: locked prices, temporal activation, atomic (cannot break)';
COMMENT ON COLUMN bundles.bundle_price IS 'Locked price for entire bundle';
COMMENT ON COLUMN bundles.regular_price IS 'Sum of individual item prices';
COMMENT ON COLUMN bundles.discount_percent IS 'Calculated as (regular_price - bundle_price) / regular_price * 100';

-- ===================================================================
-- BUNDLE ITEMS TABLE
-- ===================================================================
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bundle_items IS 'Items in a bundle with quantities';

-- ===================================================================
-- CARTS TABLE
-- ===================================================================
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  guest_email VARCHAR(255),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

COMMENT ON TABLE carts IS 'Shopping carts for registered users and guests. Expires 30 days after last_activity.';
COMMENT ON COLUMN carts.items IS 'JSONB array: [{productId, variantId, quantity}]';
COMMENT ON COLUMN carts.guest_email IS 'Email for guest carts, used for guest-to-account migration';

-- ===================================================================
-- ORDERS TABLE
-- ===================================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID,
  guest_email VARCHAR(255),
  guest_token UUID UNIQUE,
  guest_token_expires_at TIMESTAMP WITH TIME ZONE,
  items JSONB NOT NULL,
  delivery_address JSONB NOT NULL,
  order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  payment_fee DECIMAL(10, 2) DEFAULT 0,
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (order_status IN ('pending', 'pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded')),
  CHECK (payment_method IN ('cod', 'jazz_cash', 'easypaisa')),
  CHECK (payment_status IN ('awaiting_cod', 'pending', 'paid', 'failed'))
);

COMMENT ON TABLE orders IS 'Orders with snapshot of items, guest access via token, status transitions';
COMMENT ON COLUMN orders.order_number IS 'Non-sequential alphanumeric ID (e.g., ORD-XXXXXXX)';
COMMENT ON COLUMN orders.items IS 'JSONB snapshot of ordered items (prices locked at order creation)';
COMMENT ON COLUMN orders.guest_token IS 'Secure token for guest order access, 30-day expiry';
COMMENT ON COLUMN orders.status_history IS 'JSONB array: [{status, changedAt, changedBy}] for audit trail';

-- ===================================================================
-- PAYMENT ATTEMPTS TABLE
-- ===================================================================
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  gateway_response_code VARCHAR(50),
  error_reason TEXT,
  is_counted_failure BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payment_attempts IS 'Log of payment attempts for prepaid orders. Counted failures <= 3 per order over 7 days.';
COMMENT ON COLUMN payment_attempts.is_counted_failure IS 'True for genuine declines (insufficient funds, card declined). False for timeouts, gateway errors, customer cancel.';

-- ===================================================================
-- SESSIONS TABLE
-- ===================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sessions IS 'Session management with activity-based timeout. Last_activity updated on every request.';
COMMENT ON COLUMN sessions.last_activity IS 'Updated on every authenticated request for activity-based session timeout';

-- ===================================================================
-- AUDIT LOGS TABLE
-- ===================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of admin actions, inventory adjustments, etc.';
COMMENT ON COLUMN audit_logs.action IS 'e.g., product_update, order_cancel, inventory_adjustment, login_failed';
COMMENT ON COLUMN audit_logs.details IS 'Action-specific data, e.g., {old_quantity: 10, new_quantity: 8, reason: "Damaged"}';

-- ===================================================================
-- SETTINGS TABLE
-- ===================================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE settings IS 'Global settings: email, tax, fees, thresholds. Singleton pattern per key.';

-- ===================================================================
-- SERVICE AREAS TABLE
-- ===================================================================
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(100) UNIQUE NOT NULL,
  postal_code_range VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE service_areas IS 'Serviceable cities/regions. Initial scope: all of Pakistan.';

-- ===================================================================
-- EMAIL LOGS TABLE
-- ===================================================================
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  retry_count INT DEFAULT 0,
  failed_reason TEXT
);

COMMENT ON TABLE email_logs IS 'Log of all emails sent. Used for retry queue and delivery audit.';

-- ===================================================================
-- USERS TABLE (For Supabase Auth Integration)
-- ===================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'User profile extended from Supabase auth.users';
COMMENT ON COLUMN users.role IS 'customer or admin; Phase 1 has single admin role';

-- ===================================================================
-- USER ADDRESSES TABLE
-- ===================================================================
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_addresses IS 'Saved delivery addresses for registered users';

-- Create indexes on core tables for performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_inventory_product_id ON product_inventory(product_id);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_guest_email ON carts(guest_email);
CREATE INDEX idx_carts_expires_at ON carts(expires_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_inventory_updated_at BEFORE UPDATE ON product_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bundles_updated_at BEFORE UPDATE ON bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_areas_updated_at BEFORE UPDATE ON service_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
