# Supabase Migrations

## Applying Migrations

### Option 1: Supabase Dashboard (Quick)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `001_initial_schema.sql`
5. Run the query
6. Repeat for `002_rls_policies.sql`

### Option 2: Supabase CLI (Recommended)
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link your project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

### Option 3: SQL File Upload
1. Go to Supabase dashboard → SQL Editor
2. Click "New Query" → "Upload SQL file"
3. Select `001_initial_schema.sql`, run
4. Select `002_rls_policies.sql`, run

## Schema Overview

**Tables:**
- `products` - Product catalog with pricing
- `product_variants` - Size/color/SKU variants
- `cart_items` - Shopping cart (supports authenticated users + guest checkout)
- `orders` - Order records with status/payment tracking
- `order_items` - Line items for each order
- `admin_audit_logs` - Audit trail for admin operations

**Security:**
- RLS enabled on all tables
- Products: public read, admin write
- Cart/Orders: user/guest self-service, admin override
- Audit logs: admin only

**Realtime:**
- Orders and order_items tables have realtime enabled for live updates
