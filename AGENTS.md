# AGENTS.md — Muskan Care Center (MStore)

> **Project Status: Phase 0 COMPLETE — verified by user on local machine.**

## Architecture

**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + Storage) + Tailwind CSS
**Design system:** `tokens.css` (OKLCH colors, Lora/Inter/Courier Prime fonts, spacing/radius/shadow/motion tokens)
**Auth:** Supabase Auth via Server Actions in `app/auth/actions.ts` (not Better Auth — installed but unused)
**Payments:** JazzCash + Easypaisa stubs; COD primary
**Email:** Resend via `lib/email/service.ts`

## File Map

```
app/
├── layout.tsx                          # Root layout (fonts, globals)
├── page.tsx                            # Homepage
├── globals.css                         # Global styles
├── components/                         # All UI components
│   ├── header.tsx                      # Site header
│   ├── footer.tsx                      # Site footer
│   ├── auth-aware-layout.tsx           # Hides header/footer on auth pages
│   ├── user-menu.tsx                   # Auth dropdown
│   ├── product-card.tsx                # Product card
│   ├── add-to-cart-button.tsx          # Add to cart CTA
│   ├── cart-item.tsx                   # Cart line item
│   ├── checkout-form.tsx               # Checkout form
│   ├── shipment-tracker.tsx            # Shipment tracking UI
│   ├── refund-request-form.tsx         # Refund request form
│   ├── suspense-boundary.tsx           # Suspense fallback
│   └── admin/
│       ├── shipments-dashboard.tsx
│       └── refunds-dashboard.tsx
├── auth/
│   ├── actions.ts                      # Server actions: signUp, login, logout, getSession
│   ├── login/page.tsx
│   ├── signup/page.tsx                 # ⚠️ Form submission broken (GET instead of POST)
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── products/
│   ├── page.tsx                        # Product listing
│   └── [slug]/page.tsx                 # Product detail
├── cart/
│   ├── page.tsx
│   └── actions.ts                      # Cart server actions
├── checkout/page.tsx
├── orders/[id]/page.tsx
├── order-confirmation/[id]/
│   ├── page.tsx
│   ├── shipments/page.tsx
│   └── refunds/page.tsx
├── account/page.tsx
├── track-order/page.tsx
├── actions/send-email.ts
├── api/
│   ├── checkout/route.ts
│   ├── cart/add/route.ts
│   ├── track-order/route.ts
│   ├── payment/
│   │   ├── verify/route.ts
│   │   ├── callbacks/jazz-cash/route.ts
│   │   ├── callbacks/easypaisa/route.ts
│   │   ├── redirect/jazz-cash/route.ts
│   │   └── redirect/easypaisa/route.ts
│   ├── webhooks/
│   │   ├── jazz-cash/route.ts
│   │   └── easypaisa/route.ts
│   └── admin/
│       ├── shipments/route.ts
│       ├── shipments/update/route.ts
│       └── refunds/
│           ├── route.ts
│           ├── approve/route.ts
│           ├── reject/route.ts
│           └── complete/route.ts
└── admin/
    ├── layout.tsx + layout-client.tsx
    ├── dashboard/page.tsx
    ├── orders/page.tsx + [id]/page.tsx
    ├── products/page.tsx
    ├── inventory/page.tsx
    ├── shipments/page.tsx
    ├── refunds/page.tsx
    ├── audit-logs/page.tsx
    └── settings/page.tsx

server/actions/                        # Domain-separated server actions
├── auth.ts
├── cart.ts
├── orders.ts
├── payments.ts
├── products.ts
├── shipments.ts
├── refunds.ts
├── email.ts
├── audit.ts
├── admin-settings.ts
├── admin-products.ts
├── admin-inventory.ts
└── admin-orders.ts

lib/
├── supabase/
│   ├── client.ts                      # Browser client (lazy-init Proxy)
│   ├── server.ts                      # Server client
│   └── helpers.ts
├── auth/
│   ├── server.ts
│   └── admin.ts
├── hooks/
│   ├── useAuth.ts
│   └── useCart.ts
├── payments/
│   ├── url-generators.ts
│   ├── signature.ts
│   └── inventory-finalization.ts
├── email/
│   ├── service.ts
│   ├── templates.ts
│   └── webhook-dedup.ts
├── validation/schemas.ts              # Zod schemas
└── utils/helpers.ts

hooks/useAuth.tsx                      # Client auth hook (duplicate of lib/hooks/useAuth.ts?)

types/database.ts                      # Supabase generated types

supabase/migrations/                   # Canonical migrations (consolidated, runnable from clean DB)
├── 000_unified_mvp_schema.sql         # Full base schema + RLS (supersedes all legacy sets)
├── 001_create_order_items.sql         # order_items (only table missing from 000)
├── 002_seed_sample_products.sql       # Sample categories/products/variants/inventory/images
├── 003_create_bundles.sql             # Bundle offers
├── 004_create_bundle_items.sql        # Bundle line items
├── 005_order_idempotency.sql          # orders.idempotency_key (double-submit protection)
├── 006_seed_service_areas.sql         # Delivery service-area seed
├── 007_create_contact_messages.sql    # Contact Us form table
├── 008_unify_admin_rls_role.sql       # All admin RLS delegate to public.is_admin()
└── README.md

migrations/                            # Legacy (older copy, ignore)

e2e/
├── homepage.spec.ts
└── auth.spec.ts

middleware.ts                           # JWT verification (jose), role-based routing
tokens.css                             # Design system tokens + global resets
```

## Current State

### Built & Working
- Auth pages (login, signup, forgot/reset password) — **signup form submission has a bug**
- Homepage, product listing, product detail
- Cart page + server actions
- Checkout form (stub)
- Order pages (detail, confirmation, shipments, refunds)
- Account page
- Admin: dashboard, orders, products, inventory, shipments, refunds, audit-logs, settings
- Payment gateway stubs (JazzCash, Easypaisa)
- Email service (Resend) + templates
- Email reliability layer — `lib/email/delivery.ts` is the single production email path: delivery tracking in `email_logs`, send idempotency, exponential-backoff retries (cron `app/api/cron/email-retry`), atomic webhook dedup, Resend bounce/complaint webhook (`app/api/webhooks/email`) with 3-bounce recipient invalidation, and admin email-delivery visibility (`app/api/admin/email-logs` + order page). See `docs/EMAIL_RELIABILITY.md`.
- Inventory reservation with 30-min TTL + auto-release cron (`app/api/cron/release-reservations`); finalization on payment (`lib/payments/inventory-finalization.ts`)
- 15 SQL migrations (schema + RLS + features + secure admin provisioning) + P1 migration `010_email_delivery_reliability.sql`
- Secure admin provisioning — no public admin signup; initial/further admins designated via `npm run provision-admin <email>` (service_role key) or the Supabase dashboard. Customers cannot self-escalate (RLS `users_update_own` forbids role change). See `docs/ADMIN_PROVISIONING.md`.
- E2E tests (homepage + auth specs)
- 13 server action modules
- Design system (tokens.css)
- Middleware (JWT + role-based routing)
- **Phase 2 (COMPLETE):** product recommendations on product detail + cart pages; admin dashboard sparklines (14-day orders/revenue) + order-status and payment-method distribution analytics; Supabase Storage product-image upload verified (bucket + public-read policy declared in migration `011_ensure_product_images_storage.sql`); responsive/mobile UX validated and cart-item row made mobile-friendly

### Not Built / Unverified (genuine gaps)
- Signup form submission (broken — GET instead of POST) — not classified as P2
- Real JazzCash/Easypaisa API integration
- Password reset email flow (handled by Supabase Auth built-in, outside custom reliability layer)
- Admin audit log writing from actions
- Bundle offers (UI + pricing lock) — data model + admin UI exist

### Phase 2 — COMPLETE (verified)
- Product recommendations on product detail (category-based "You Might Also Like") and cart pages
- Admin dashboard sparklines (14-day orders + revenue) and status/payment-method distribution bars
- Product image upload via Supabase Storage (verified wired; bucket + public-read policy in migration `011`)
- Responsive/mobile UX validation; cart-item row made mobile-friendly (stacks on small screens)

## Conventions

### Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (passes clean)
npm run test:e2e     # Playwright tests
```

### Code Rules (from CLAUDE.md)
1. **Stack discipline:** Next.js App Router + Supabase only — no new deps without justification
2. **Supabase is source of truth:** Schema changes via migrations only
3. **Security:** RLS on every table; validate server-side even if UI checks
4. **Secrets:** Server-side only, never in `NEXT_PUBLIC_*` or client components
5. **Simplicity:** Server Components + Server Actions over client state
6. **Reuse:** Check existing components/hooks before writing new
7. **Spec before work:** Non-trivial features get a spec first
8. **Definition of done:** Matches spec, passes lint/type-check, RLS verified

### Design Tokens
- Use `var(--color-*)`, `var(--text-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)` — never hardcoded values
- Fonts: `var(--font-display)` (Lora), `var(--font-body)` (Inter), `var(--font-mono)` (Courier Prime)
- Focus states: `focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]` (global input styles handle ring color)
- Buttons use action verbs (Add, Buy, Checkout) — never "Submit" or "OK"

### Auth Flow
- Server Actions in `app/auth/actions.ts` (signUpAction, loginAction, logoutAction, getCurrentSessionAction)
- Supabase client in `lib/supabase/client.ts` (lazy-init via Proxy)
- JWT verified in `middleware.ts` using `jose`
- Cookies: `auth-token` (access), `refresh-token` (7 days)

### File Organization
- Components: `app/components/` (not root `components/`)
- Server actions: `server/actions/` (domain-separated) + `app/*/actions.ts` (page-specific)
- Libraries: `lib/` (supabase, auth, payments, email, validation, utils)
- Hooks: `lib/hooks/` + `hooks/useAuth.tsx`
- Types: `types/database.ts`

## Documentation

All project docs are in `docs/`:
- `spec.md` — Full feature spec with acceptance criteria
- `design.md` — Design system, page layouts, component patterns
- `IMPLEMENTATION_PLAN.md` — Technical architecture + implementation details
- `RESEARCH_FINDINGS.md` — Market research + implementation options
- `AUTH_SETUP.md` — Auth migration + testing guide
- `AUTHENTICATION_COMPLETE.md` — Auth implementation summary
- `ENVIRONMENT_SETUP.md` — Local dev setup guide
- `E2E_TESTING.md` — Playwright testing guide

Constitution: `CLAUDE.md` (root)
