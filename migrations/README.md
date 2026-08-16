# Database Migrations

Supabase SQL migrations for Muskan Care Center E-Commerce Store. All migrations are tracked in git per the constitution requirement: "schema changes go through migrations, never manual dashboard edits."

## Migration Files

### 001_initial_schema.sql
Creates the core database schema with 13 tables:
- **categories** — Product categories with hierarchical support
- **products** — Main product catalog (soft-deleted via is_active flag)
- **variants** — Product variants (e.g., Size M, L)
- **product_images** — Product images stored in Supabase Storage
- **product_inventory** — Stock tracking with reserved (checkout) column
- **bundles** — Bundle offers with locked prices and temporal activation
- **bundle_items** — Items in a bundle
- **carts** — Shopping carts for customers and guests (30-day expiry)
- **orders** — Order lifecycle with snapshot of items, guest token access
- **payment_attempts** — Log of payment attempts for prepaid orders
- **sessions** — Session management with activity-based timeout tracking
- **audit_logs** — Immutable audit trail of all admin actions
- **settings** — Global configuration (email, tax, fees, thresholds)
- **service_areas** — Serviceable cities (initial: all Pakistan)
- **email_logs** — Log of all emails sent
- **users** — User profile extended from Supabase auth.users
- **user_addresses** — Saved delivery addresses

#### Key Features:
- Foreign key constraints with appropriate cascade/restrict rules
- Check constraints on prices (> 0), statuses (enum-like via CHECK)
- Unique constraints on SKU, order_number, category slug
- Indexes on all high-query columns (user_id, product_id, status, etc.)
- Auto-updated `updated_at` timestamps via trigger function
- JSONB columns for flexible data (items, addresses, status_history)

### 002_rls_policies.sql
Implements Row-Level Security (RLS) policies per IMPLEMENTATION_PLAN.md Section 15:

#### Security Model: Default-Deny
All tables have RLS enabled with explicit deny-all, then specific policies grant access:

**Customer Access:**
- Read public products (is_active=true)
- Read own orders (user_id = auth.uid())
- Read own carts
- Read own sessions
- Read own addresses
- Create orders, carts, addresses

**Admin Access:**
- Full CRUD on all resources (products, orders, bundles, settings, service areas)
- Audit logging of all admin actions
- Read all audit logs

**Guest Access:**
- Read public products
- Create carts
- Create guest orders (user_id IS NULL, guest_email set)
- Access guest orders via secure token (guest_token)

#### Policy Details:
- `products_public_read` — Show only active products to customers, all to admins
- `variants_public_read` — Show only if product is active
- `orders_customer_read` — Customers see own orders, guests see via token, admins see all
- `carts_customer_read` — Customer owns own cart, guests use guest_email header
- `audit_logs_admin_read` — Admin-only access to audit trail
- `users_own_read` — Users read own profile, admins read all
- Admin write policies check role = 'admin' before allowing mutations

## Applying Migrations

### Local Development
```bash
# Using Supabase CLI
supabase db push

# Or manual via Supabase Dashboard SQL Editor:
# 1. Open project SQL Editor
# 2. Run 001_initial_schema.sql
# 3. Run 002_rls_policies.sql
```

### Staging/Production
```bash
# Via Supabase Dashboard or CLI
supabase db push --linked
```

## Verification

After applying migrations, verify in Supabase Dashboard:
1. **Tables created** — All 17 tables visible in Table Editor
2. **RLS enabled** — Each table shows "RLS enabled" badge
3. **Policies active** — 50+ policies listed in Security/RLS Policies
4. **Triggers working** — Run `SELECT * FROM information_schema.triggers` in SQL Editor
5. **Indexes created** — Check query performance on indexed columns

## Future Migrations

As features are added:
- Create `003_<feature>.sql` for each feature
- Use sequential numbering
- Commit to git before deploying
- Never edit deployed migrations; create new ones for schema changes
