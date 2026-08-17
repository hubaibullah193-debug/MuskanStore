# AGENTS.md — Muskan Care Center (MStore)

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

supabase/migrations/                   # Canonical migrations (14 files)
├── 000_unified_mvp_schema.sql
├── 001_initial_schema.sql
├── 001_fix_rls_use_auth_jwt.sql
├── 002_rls_policies.sql
├── 003_add_featured_to_products.sql
├── 004_seed_sample_products.sql
├── 005_create_users_table.sql
├── 006_create_payment_attempts_table.sql
├── 007_create_email_logs_table.sql
├── 008_create_refunds_table.sql
├── 009_create_shipments_table.sql
├── 010_inventory_reservations.sql
├── 011_webhook_email_tracking.sql
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
- 14 SQL migrations (schema + RLS + features)
- E2E tests (homepage + auth specs)
- 13 server action modules
- Design system (tokens.css)
- Middleware (JWT + role-based routing)

### Not Built / Unverified
- Signup form submission (broken — GET instead of POST)
- Cart persistence across sessions
- Order creation → inventory decrement → confirmation email chain
- Real JazzCash/Easypaisa API integration
- Password reset email flow
- Inventory reservation during checkout
- Email notifications (order, payment, status, refund)
- Guest checkout + token-based tracking
- Admin audit log writing from actions
- Daily low-stock digest email
- Product recommendations
- Bundle offers (UI + pricing lock)
- Bulk CSV upload (admin)
- CSV export (admin orders)
- Responsive design validation
- Guest-to-account cart merge
- Product image upload via Supabase Storage
- Admin charts/sparklines

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
