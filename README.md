# MStore — Muskan Care Center E-Commerce

> **Status:** Functional MVP. Core commerce flows (browse → cart → checkout → order → admin) are implemented and the project type-checks and lints cleanly. Prepaid payment gateways (JazzCash/Easypaisa) and some email/edge flows remain stubbed or depend on external configuration.

## Project Overview

MStore is a storefront for **Muskan Care Center**, a Pakistan-focused personal-hygiene e-commerce site. Customers can browse products, manage a cart (guest or signed-in), check out with Cash-on-Delivery (COD) or prepaid gateways, and track orders. Store administrators manage products, inventory, orders, shipments, refunds, bundles, and view an audit log.

The application is a **Next.js 14 (App Router)** project backed by **Supabase** (PostgreSQL + Auth + Storage) with **Tailwind CSS** for styling and **Resend** for transactional email.

## Features

Verified present in the codebase:

- **Storefront**
  - Homepage with featured products
  - Product listing and product detail pages (variants, images, stock status)
  - Category browsing (data model + navigation)
  - Cart with quantity/remove, **persistent for signed-in users (Supabase)** and **guest users (localStorage)**, plus **guest-to-account merge** on login (`lib/hooks/useCart.ts`)
  - Guest and authenticated checkout
  - Order confirmation, shipment tracking, and refund-request pages
  - Account page (profile, order history), track-order page (token-based for guests)
  - Contact, Shipping, and Privacy Policy informational pages

- **Checkout & Orders**
  - Server-side price calculation (client prices never trusted)
  - Delivery service-area validation (`service_areas` table)
  - Idempotency key to prevent duplicate orders on double-submit/retry (`orders.idempotency_key`)
  - Inventory reservation on checkout; immediate finalization for COD (`server/actions/orders.ts`)
  - Order status transitions, cancellation (with stock release), refund requests
  - Guest orders tracked via `guest_token`

- **Payments**
  - COD fully supported (order confirmed immediately, admin marks paid)
  - JazzCash / Easypaisa **URL generators, redirect, callback, and webhook route stubs** under `app/api/payment/*` and `app/api/webhooks/*` (no live gateway credentials integrated)

- **Admin**
  - Dashboard, Orders (with **CSV export**), Products (with **CSV bulk upload** and image upload), Inventory, Shipments, Refunds (approve/reject/complete), Bundles, Audit Logs, Settings
  - Admin API routes protected by role (`public.is_admin()`)

- **Email** (`lib/email/service.ts`, `lib/email/delivery.ts`, `server/actions/email.ts`)
  - Single production email path (`logAndSendEmail`) with `email_logs` delivery tracking, idempotency, and exponential-backoff retries
  - Order confirmation, payment-status, refund, and shipment emails
  - Password-reset email (via Supabase Auth `resetPasswordForEmail`, outside custom reliability layer)
  - Daily **low-stock digest** cron endpoint (`app/api/cron/low-stock-digest/route.ts`) — routed through the reliable path
  - Cron endpoints: `email-retry` (retries failed emails) and `release-reservations` (releases expired inventory holds)
  - Resend bounce/complaint webhook (`app/api/webhooks/email`)
  - Provider abstraction (Resend default; SendGrid optional)

- **Auth & Security**
  - Supabase Auth via Server Actions (`app/auth/actions.ts`): signup, login, logout, session
  - HTTP-only `auth-token` / `refresh-token` cookies
  - JWT verification against Supabase JWKS (`lib/auth/verify.ts`)
  - Route protection middleware at project root (`middleware.ts`) for `/account`, `/orders`, and `/api/admin`
  - Row-Level Security enabled on all tables; admin authorization unified on `public.is_admin()` (migrations `008`)

- **Bundles**
  - Bundle data model + admin UI (`app/admin/bundles`, `server/actions/bundles.ts`, migrations `003`/`004`)

## Tech Stack

| Concern        | Technology |
|----------------|------------|
| Framework      | Next.js 14 (App Router, Server Actions, Route Handlers) |
| Language       | TypeScript (strict-ish, `tsc --noEmit` passes) |
| Database/Auth  | Supabase (PostgreSQL, Supabase Auth, Storage) |
| Styling        | Tailwind CSS + `tokens.css` design tokens (OKLCH colors, Lora/Inter/Courier Prime) |
| Email          | Resend (default) / SendGrid (optional) |
| Validation     | Zod (`lib/validation/schemas.ts`) |
| JWT verify     | `jose` (JWKS) |
| Testing        | Vitest unit (`tests/unit/*`) + Playwright E2E (`e2e/*.spec.ts`) |
| Lint           | ESLint (`next lint` passes) |

> Better Auth is listed as a dependency but is **not used** — authentication is implemented with Supabase Auth directly (confirmed by `package.json` and `app/auth/actions.ts`).

## Installation / Setup

Prerequisites: Node.js 18+, a Supabase project, and (optionally) a Resend account.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in the values (see Environment Variables below)

# 3. Apply database migrations (from a clean DB)
# Link your Supabase project, then:
supabase db push
  # or run the canonical files in supabase/migrations/ in order (000 → 014)

# 4. Seed sample data (optional, for local dev)
# migration 002 seeds categories/products/variants/inventory/images
# migration 006 seeds delivery service areas

# 5. Run the dev server
npm run dev
```

> **Note:** The canonical set is `000`–`014`, a clean monotonic sequence (no numbering collisions). Apply the whole ordered set. The legacy `migrations/` directory and the `supabase/combined_migration.sql` / `supabase/fix_bundles_and_rls.sql` artifacts were removed during the Phase 3 hygiene pass.

## Environment Variables

Defined in `.env.example`. **Required for the app to function:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-respecting client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client (bypasses RLS) — never expose to client |
| `SUPABASE_JWT_SECRET` | Documented as JWT secret (actual verification uses Supabase JWKS) |
| `NEXT_PUBLIC_SITE_URL` | Public HTTPS domain (payment callbacks, auth links) |
| `RESEND_API_KEY` | Resend API key (transactional email) |
| `EMAIL_FROM` | Verified sender address |
| `EMAIL_PROVIDER` | `resend` (default) or `sendgrid` |
| `CRON_SECRET` | Secret for the cron endpoints (low-stock digest, email-retry, release-reservations) |
| `ADMIN_EMAIL` | Recipient for admin notifications (e.g., low-stock digest) |
| `RESEND_WEBHOOK_SECRET` | HMAC secret to verify Resend delivery webhooks (optional; unverified locally) |

**Payment gateways (required only for live prepaid payments):**

| Variable | Purpose |
|----------|---------|
| `JAZZ_CASH_MERCHANT_ID`, `JAZZ_CASH_PP_PASSWORD` | JazzCash credentials (stubbed) |
| `EASYPAISA_MERCHANT_ID`, `EASYPAISA_SECRET` | Easypaisa credentials (stubbed) |
| `PAYMENT_WEBHOOK_SECRET` | HMAC secret used to sign and verify the payment-gateway **return URL** (defense-in-depth); applied by the `callbacks/*` handlers. The authoritative payment confirmation is the server-to-server webhook at `/api/webhooks/{jazz-cash,easypaisa}`. |

> **Verified:** these variables are referenced in code/config. Live payment processing is **not** integrated — only stub URL generators and route skeletons exist.

> **Admin access:** signup always creates `role = 'customer'`. To obtain an admin, run `npm run provision-admin <email>` (service-role script) or use the Supabase dashboard. There is intentionally no self-service admin signup.

## Development Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (verified: no warnings/errors)
npm run type-check   # tsc --noEmit (verified: passes clean)
npm run test:unit    # Vitest unit tests (bundle pricing, security headers, helpers)
npm run test:e2e     # Playwright end-to-end tests
npm run test:e2e:ui  # Playwright UI mode
npm run test:e2e:debug
```

## Project Structure

```
app/
├── layout.tsx, page.tsx, globals.css
├── middleware.ts                 # ACTIVE auth/role middleware (root)
├── components/                  # UI components (header, footer, product-card, …)
├── auth/                        # login, signup, forgot/reset password + actions.ts
├── products/                    # listing + [slug] detail
├── cart/                        # cart page + actions
├── checkout/                    # checkout page (guest + auth)
├── orders/                      # order history + [id] detail
├── order-confirmation/[id]/     # confirmation, shipments, refunds
├── account/, track-order/
├── contact/, shipping/, privacy-policy/   # informational pages
├── admin/                       # dashboard, orders, products, inventory,
│                                 #   shipments, refunds, bundles, audit-logs, settings
└── api/
    ├── checkout/route.ts        # POST order creation
    ├── cart/add/route.ts
    ├── track-order/route.ts
    ├── payment/                 # verify, redirect/*, callbacks/*
    ├── webhooks/                # jazz-cash, easypaisa
    ├── admin/                   # shipments/*, refunds/*
    └── cron/low-stock-digest/   # GET daily digest (secret-protected)

server/actions/                  # Domain server actions
├── auth, cart, orders, payments, products, shipments, refunds,
│   email, audit, contact, bundles,
└── admin-*/                     # admin-dashboard, admin-orders, admin-products,
                                 #   admin-inventory, admin-settings, admin-bundles

lib/
├── supabase/                    # client.ts (anon + admin Proxy clients), server.ts, helpers.ts
├── auth/                        # server.ts (Supabase Auth helpers), admin.ts, verify.ts (JWKS)
├── hooks/                       # useAuth.ts, useCart.ts
├── payments/                    # url-generators, signature, inventory-finalization
├── email/                       # service.ts, templates.ts, webhook-dedup.ts
├── validation/schemas.ts        # Zod schemas
└── utils/helpers.ts

supabase/migrations/             # Canonical migrations 000–014 (run in order)
types/database.ts                # Generated Supabase types
tokens.css                       # Design system tokens
middleware.ts                    # Root middleware (active)
e2e/                             # Playwright specs (homepage, auth)
docs/                            # Project documentation (spec, design, plans, audits)
```

> **Notes on structure accuracy:** AGENTS.md's file map is kept in sync with the actual tree. Verified additions include `app/contact`, `app/shipping`, `app/privacy-policy`, `app/orders`, `app/admin/bundles`, `app/api/cron/low-stock-digest`, `app/api/cron/email-retry`, `app/api/cron/release-reservations`, `server/actions/contact.ts`, `server/actions/bundles.ts`, `server/actions/admin-bundles.ts`, `server/actions/admin-dashboard.ts`, and `lib/auth/verify.ts`. The client auth hook lives at `lib/hooks/useAuth.ts`.

## Database / Setup Information

- Schema and RLS live in `supabase/migrations/` (canonical, runnable from a clean DB).
- Tables include: `users`, `categories`, `products`, `product_variants`, `product_images`, `product_inventory`, `cart_items`, `orders`, `order_items`, `payment_attempts`, `inventory_reservations`, `webhook_processing`, `shipments`, `refunds`, `email_logs`, `admin_audit_logs`, `webhook_email_tracking`, `audit_logs`, `settings`, `service_areas`, `bundles`, `bundle_items`, `contact_messages`.
- RLS is enabled on all tables; admin checks delegate to `public.is_admin()` (migration `008`).
- Realtime is enabled for `orders` and `shipments`.
- Sample data is seeded by migrations `002` (products) and `006` (service areas).

> **Not verified in this review:** whether the migrations execute cleanly against a live Supabase instance (no DB was available during the audit). The files are internally consistent and reference each other in order.

## Testing

- **Unit tests:** `vitest` suites in `tests/unit/` covering server-side bundle price-locking, security headers, and helper logic. Run with `npm run test:unit` (22 passing).
- **End-to-end:** Playwright specs in `e2e/` (`homepage.spec.ts`, `auth.spec.ts`). Run with `npm run test:e2e`.
- **Type checking / Lint:** both verified passing during this review (`tsc --noEmit` clean, `next lint` clean).

> The E2E specs expect a running app with seeded data; they were **not executed** as part of this audit (no live environment was started).

## Deployment

- Standard Next.js deployment (e.g., Vercel). `npm run build` produces the production bundle.
- Required at runtime: all environment variables above, an applied Supabase schema, and (for email) a verified Resend domain.
- Cron endpoints are exposed under `/api/cron/*?secret=CRON_SECRET` (low-stock-digest, email-retry, release-reservations) and should be triggered by an external scheduler (Vercel Cron / GitHub Actions).
- Set `SUPABASE_SERVICE_ROLE_KEY` and `PAYMENT_WEBHOOK_SECRET` as **server-only** secrets (never `NEXT_PUBLIC_*`).

## Current Project Status

**Working / verified:**
- Storefront browsing, product detail, persistent cart (guest + signed-in + merge)
- **Bundles fully purchasable** with a server-side `bundle_price` lock (`lib/orders/bundle-pricing.ts`); client prices/contents are ignored — `npm run test:unit` covers this.
- Full checkout and order lifecycle for **COD**
- Admin console (orders incl. CSV export, products incl. CSV bulk upload + image upload, inventory, shipments, refunds, bundles, audit logs, settings)
- Auth (signup/login/logout/session), password-reset email (Supabase Auth), route protection
- Refund requests: real `refunds` record + admin notification + audit (no client-controlled payout fields)
- Email notifications (order confirmation, payment status, refund, shipment, low-stock digest) with delivery tracking + retry
- **Security headers / CSP** applied via `middleware.ts` (`lib/security/headers.ts`)
- **SEO:** `app/robots.ts` + `app/sitemap.ts` (build emits `/robots.txt` + `/sitemap.xml`)
- Clean type-check, lint, and build (verified); `npm run test:unit` (22 passing)

**Partially complete / stubbed (verify before relying on):**
- **JazzCash / Easypaisa prepaid payments** — route skeletons and URL generators exist, but no live gateway integration. Payment verification is **fail-closed and webhook-only** (no public `/api/payment/verify`); exact gateway field values must be confirmed against merchant docs before go-live. See `docs/PAYMENT_ARCHITECTURE.md`.
- **Email delivery** depends on `RESEND_API_KEY` and a verified sender domain; failed sends are tracked in `email_logs` and retried by the email-retry cron (up to 3 attempts over 24h).

**Known issues to resolve before launch (see audit):**
- Admin provisioning is by-design via `npm run provision-admin` (no self-service UI).
- Prepaid payments (JazzCash/Easypaisa) require live gateway credentials, merchant onboarding, and webhook/IPN registration before they finalize orders.
- Documentation lag was corrected in the Phase 1 pass; `docs/remaining_work.md` tracks remaining (post-Phase-1) work.

---
*README generated from a static review of the codebase. Items marked "Not verified" were not executed against a live environment.*
