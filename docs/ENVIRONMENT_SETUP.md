# Environment Setup Guide

## Overview

This guide walks through setting up a local development environment for mstore, a Next.js + Supabase e-commerce platform. All infrastructure and schema changes go through migrations — never manual dashboard edits.

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- Git
- Supabase account ([create free](https://supabase.com))
- A code editor (VS Code, WebStorm, etc.)

## Quick Start (5 minutes)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd mstore
npm install
```

### 2. Set up Supabase

#### Option A: Cloud (Recommended for teams)

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. Name: `mstore-dev` (or similar)
3. Region: Choose closest to you
4. Database password: Generate a strong one (save it)
5. Wait 2–3 minutes for setup

#### Option B: Local (Docker required)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Initialize local Supabase
supabase init

# Start local instance
supabase start
```

### 3. Get credentials

**For Cloud:**
- Go to Project Settings → API keys
- Copy `Project URL` and `anon public key`
- Create a service role key (Settings → API keys → New key → Service role)

**For Local:**
- Use the URLs and keys printed by `supabase start`

### 4. Configure environment

Copy `.env.example` to `.env.local` and fill in the Supabase values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (from step 3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Keep these for now (not implemented yet)
# BETTER_AUTH_SECRET=your_secret_here_min_32_chars
# REDIS_URL=redis://default:password@host:port
# JAZZ_CASH_MERCHANT_ID=your_merchant_id
# ... etc
```

**Security reminder:** `.env.local` is gitignored. Never commit secrets.

### 5. Run migrations

**For Cloud:**

```bash
# Use Supabase CLI to push migrations
supabase db push
```

This applies:
- `supabase/migrations/000_unified_mvp_schema.sql` — Base schema (tables, indexes, realtime, RLS + base policies)
- `supabase/migrations/008_unify_admin_rls_role.sql` — Unifies admin authorization in RLS
- plus the remaining ordered `00x_*.sql` migrations (seeds, bundles, email reliability, storage, etc.)

**For Local:**

```bash
supabase db push
```

### 6. Seed sample data (optional)

```bash
# Coming soon: seeding script for dev products
# For now, add products manually in Supabase dashboard or:
npm run seed
```

### 7. Start development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the homepage with featured products (if any exist in the database).

## Database Schema

### Tables

**products** — All merchandise
- `id` (UUID, primary key)
- `name` (text) — Product name
- `slug` (text, unique) — URL-friendly identifier
- `description` (text)
- `base_price` (numeric) — Price in PKR
- `stock_quantity` (integer) — Total available
- `is_active` (boolean) — Visibility flag
- `featured` (boolean) — **TODO: Add this column** (see below)
- `created_at`, `updated_at` (timestamp)

**product_variants** — Sizes, colors, styles per product
- `id`, `product_id` (UUID)
- `sku` (text, unique)
- `variant_name` (text) — e.g., "Small Red"
- `price_adjustment` (numeric)
- `stock_quantity` (integer)
- `is_active` (boolean)

**cart_items** — Shopping cart
- `id`, `user_id` (UUID, optional), `guest_email` (text, optional)
- `product_id`, `variant_id` (UUID)
- `quantity`, `price` (numeric)
- Constraint: Either `user_id` or `guest_email`, never both

**orders** — Completed and pending orders
- `id`, `user_id` (optional), `guest_email` (optional)
- `order_number` (text, unique)
- `order_status` (text) — pending, processing, shipped, delivered, cancelled
- `payment_status` (text) — pending, completed, failed
- `items` (jsonb) — Order line items snapshot
- `subtotal`, `tax`, `shipping_fee`, `total_amount` (numeric)
- `shipping_address`, `billing_address` (jsonb)
- `status_history` (jsonb) — Timeline of status changes
- `created_at`, `updated_at` (timestamp)

**order_items** — Line item detail
- `id`, `order_id` (UUID)
- `product_id`, `variant_id` (UUID)
- `quantity`, `unit_price`, `line_total` (numeric)

**admin_audit_logs** — Admin action tracking
- `id`, `admin_id` (UUID)
- `action` (text) — What was done
- `entity_type` (text) — products, orders, etc.
- `entity_id` (UUID) — Which record
- `changes` (jsonb) — Before/after diff
- `created_at` (timestamp)

### Security: Row-Level Security (RLS)

Every table has RLS enabled. Key policies:

- **products**: Public read, admins (email ends with `@admin.*`) can modify
- **cart_items**: Users/guests can only see/modify their own
- **orders**: Users/guests see their own, admins see all
- **admin_audit_logs**: Admins only

**Important:** RLS is enforced at the database layer — client code is never trusted, even if the UI validates input.

## Schema Migrations

Migrations live in `supabase/migrations/` and are applied in numeric order.

### Adding a column (example)

Create `supabase/migrations/015_add_featured_to_products.sql`:

```sql
-- Add featured column to highlight products on homepage
alter table public.products
  add column featured boolean default false;

-- Index for faster filtering
create index idx_products_featured on public.products(featured) where featured = true;
```

Apply it:

```bash
supabase db push
```

### Modifying policies

Edit the relevant file in `supabase/migrations/000_unified_mvp_schema.sql` (or create a new migration). RLS policies are idempotent within a single transaction, so updates are safe.

## Environment Variables Reference

### Required (no defaults)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe to expose) | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-side only) | `eyJhbGc...` |

### Optional (for future features)

| Variable | Purpose | Default |
|----------|---------|---------|
| `BETTER_AUTH_SECRET` | Auth encryption key (32+ chars) | Not set |
| `REDIS_URL` | Session/cache store | Not set |
| `JAZZ_CASH_MERCHANT_ID` | Payment gateway (JazzCash) | Not set |
| `JAZZ_CASH_SECRET` | Payment gateway secret | Not set |
| `JAZZ_CASH_PP_PASSWORD` | Payment gateway password | Not set |
| `EASYPAISA_MERCHANT_ID` | Payment gateway (EasyPaisa) | Not set |
| `EASYPAISA_SECRET` | Payment gateway secret | Not set |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Customer support email | Not set |
| `NEXT_PUBLIC_SUPPORT_PHONE` | Customer support phone | Not set |
| `NEXT_PUBLIC_WEBSITE_URL` | Site URL (for emails, links) | Not set |

## Verification Checklist

After setup, verify everything works:

```bash
# 1. Run type checking
npm run type-check

# 2. Run linter
npm run lint

# 3. Start dev server
npm run dev

# 4. Check console for errors
# Should see: "▲ Next.js X.X.X" with no critical errors

# 5. Open http://localhost:3000
# Should see homepage with header, footer, hero section
# Featured products section shows empty if no products exist (OK)

# 6. Verify database connection
# In browser DevTools console, open Network tab
# Check that no 500 errors appear on page load
```

## Common Issues

### "NEXT_PUBLIC_SUPABASE_URL is not set"

```
✗ Error: NEXT_PUBLIC_SUPABASE_URL not found in environment
```

**Fix:** Make sure `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL` set.

```bash
# Check if file exists
ls -la .env.local

# Check if it has content
cat .env.local
```

### "Connection refused" or timeout errors

```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**For Cloud:** Check internet connection and that Supabase project is running.

**For Local:** Make sure Supabase is started:

```bash
supabase start
# Should output: Started project...
```

### RLS denies all requests

```
new row violates row-level security policy
```

**Cause:** RLS policy is too restrictive, or auth context is missing.

**Fix:** Check that:
1. User is authenticated (if policy requires it)
2. `auth.uid()` matches the record's `user_id`
3. Email matches if using `guest_email`

For debugging, temporarily disable RLS (dev only):

```sql
alter table public.products disable row level security;
```

Then re-enable when done.

## Development Workflow

### Before each session

```bash
# Pull latest code
git pull

# Update dependencies
npm install

# Ensure migrations applied
supabase db push

# Start dev server
npm run dev
```

### Making schema changes

1. Create new migration file in `supabase/migrations/NNN_description.sql`
2. Write SQL (use transactions if complex)
3. Push: `supabase db push`
4. Test locally
5. Commit migration file + code changes together

### Testing locally

```bash
# Full build (catches type errors, unused imports, etc.)
npm run build

# Type checking only
npm run type-check

# Linting
npm run lint

# Start dev server
npm run dev
```

## Next Steps

1. ✅ Complete this setup
2. 📝 Add sample products to test homepage
3. 🔐 Set up authentication (Better Auth)
4. 💳 Integrate payment gateways (JazzCash, EasyPaisa)
5. 🛒 Build cart and checkout flow
6. 📧 Configure email notifications

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Project Constitution](./CLAUDE.md)

## Questions?

Refer to [CLAUDE.md](./CLAUDE.md) for stack discipline and development rules.
