# Supabase Migrations

## Applying Migrations

The canonical set lives in `supabase/migrations/` and is designed to run from a
clean database (e.g. `supabase db reset` or a fresh `supabase db push`).

```bash
# Link your project (one time)
supabase link --project-ref <your-project-ref>

# Apply all migrations in order
supabase db push
```

Do **not** apply files individually — the files are numbered sequentially and
each later file builds on `000_unified_mvp_schema.sql`.

## Migration Order

1. `000_unified_mvp_schema.sql` — full base schema (tables, indexes, RLS, grants, realtime). Supersedes all legacy migration sets.
2. `001_create_order_items.sql` — `order_items` (the only table not in `000`).
3. `002_seed_sample_products.sql` — sample categories/products/variants/inventory/images.
4. `003_create_bundles.sql` — bundle offers.
5. `004_create_bundle_items.sql` — bundle line items.
6. `005_order_idempotency.sql` — `orders.idempotency_key` (double-submit protection).
7. `006_seed_service_areas.sql` — delivery service-area seed.
8. `007_create_contact_messages.sql` — Contact Us form table.
9. `008_unify_admin_rls_role.sql` — every admin RLS policy delegates to `public.is_admin()` (role-based, not email-suffix).

## Schema Overview

**Tables:** users, categories, products, product_variants, product_images,
product_inventory, cart_items, orders, order_items, payment_attempts,
inventory_reservations, webhook_processing, shipments, refunds, email_logs,
admin_audit_logs, webhook_email_tracking, audit_logs, settings, service_areas,
bundles, bundle_items, contact_messages.

**Security:** RLS enabled on all tables. Admin authorization is unified on
`public.is_admin()` (reads `public.users.role = 'admin'`).

**Realtime:** orders and shipments are added to `supabase_realtime`.
