# Muskan Care Center (MStore) – Project Audit Summary

## Table of Contents
1. [Pre‑conditions](#pre-conditions)
2. [Known Bugs (fixed & pending)](#known-bugs-fixed--pending)
3. [Skipped Documentation Steps](#skipped-documentation-steps)
4. [Next Actions](#next-actions)

---

## Pre‑conditions
*(Must be satisfied before starting the bug‑fix sequence.)*

| # | Pre‑condition | How to verify / fix |
|---|---------------|---------------------|
| 1 | **Database migrations applied** (001‑005) | Run `supabase db push` or execute the SQL files in `supabase/migrations/` against the Supabase project. Tables `users`, `profiles`, `orders`, `carts`, `refunds`, `shipments`, `product_images`, `product_inventory`, `product_variants`, `categories`, `settings`, `service_areas`, `payment_attempts`, `inventory_reservations`, `admin_audit_logs`, `audit_logs`, `order_items` must appear. |
| 2 | **`.env.local` contains required variables** | File at project root with at minimum: <br>`NEXT_PUBLIC_SUPABASE_URL` <br>`NEXT_PUBLIC_SUPABASE_ANON_KEY` <br>`SUPABASE_SERVICE_ROLE_KEY` <br>`RESEND_API_KEY` (optional, for email) |
| 3 | **`'use server'` pragma in `app/auth/actions.ts`** | First line of `app/auth/actions.ts` must be `'use server`. Lint should pass; form submissions should show POST requests. |
| 4 | **Better‑Auth middleware forwards `auth-token` cookie** | After login, DevTools → Application → Cookies should show a `supabase-auth-token` (or `auth-token`) cookie. Protected pages (admin, order) load without RLS errors. |
| 5 | **Server‑action imports correct in signup/login pages** | `app/auth/signup/page.tsx` and `app/auth/login/page.tsx` import `signUpAction` / `loginAction` from `'@/app/auth/actions'` and call them after `e.preventDefault()`. Network tab shows POST, not GET. |
| 6 | **Server actions use the Supabase server client** | Server actions import `supabase` from `'@/lib/supabase/server'` (created with `createServerClient`). DB writes (order, cart, etc.) respect RLS and insert rows under the correct user ID. |
| 7 | **Resend API key available (optional)** | `RESEND_API_KEY` set in `.env.local`. Email‑sending actions compile and run without “missing env var” errors. |

**Status:** Items 1‑2 were missing (migrations not pushed, env vars incomplete). Items 3‑7 need verification once the dev server is running.

---

## Known Bugs (Fixed & Pending)

| # | Bug (page / area) | Symptom | Fix applied / Required change | Status |
|---|-------------------|---------|------------------------------|--------|
| **1** | `order_items` table missing – “relation public.order_items does not exist” | SQL query fails when code tries to insert/order items. | Executed the `CREATE TABLE public.order_items …` statement (see migration `001_initial_schema.sql`). Table now exists. | ✅ Fixed |
| **2** | Duplicate‑key violation on `products_slug_key` for slug `shea-butter-soap` | Seed migration `004_seed_sample_products.sql` fails on re‑run. | Modified `004_seed_sample_products.sql` to use `ON CONFLICT (slug) DO NOTHING` for the Shea Butter Soap insert. | ✅ Fixed |
| **3** | Signup form “GET instead of POST” | Form submission falls back to GET, breaking auth flow. | Add `'use server'` at top of `app/auth/actions.ts` and ensure `onSubmit` calls `e.preventDefault()` then `await signUpAction(...)`. | ⏳ Pending (verify after dev server) |
| **4** | Login form same POST issue | Same as Bug 3 for `loginAction`. | Add `'use server'` and correct import in `app/auth/login/page.tsx`. | ⏳ Pending |
| **5** | Product detail 500 error (earlier BUG 1 – mouse event handlers) | Console JS error causing 500. | Remove/guard `onMouseEnter`/`onMouseLeave` on image overlays in `app/products/[slug]/page.tsx`. | ⏳ Pending |
| **6** | Cart persistence loss on refresh | Cart items disappear after page reload. | Add Supabase sync in `useCart` hook: on every add/remove, upsert a row in `public.cart_items`. Restore from DB on load. | ⏳ Pending |
| **7** | Checkout API not POST‑only / missing order creation | `/api/checkout` may accept GET or return errors. | Guard route with `if (request.method !== 'POST') return new Response('Method Not Allowed', {status:405});` and ensure handler creates order row, validates inventory, returns `{success:true, redirectUrl: '…'}`. | ⏳ Pending |
| **8** | Order tracking – guest‑token handling | Missing token leads to 404 / unable to load order. | Verify `searchParams.get('token')` flow in `app/orders/[id]/page.tsx` and `getOrderForDisplay` action; add ownership check in `requestRefund`. | ⏳ Pending |
| **9** | Admin dashboard RLS / session propagation | Dashboard shows “no orders” or RLS denied because admin JWT not forwarded to Supabase. | Use Better‑Auth server client (`supabase from '@/lib/supabase/server'`) or ensure admin profile has `role=admin` and RLS policy `auth.role()='admin'` is active. | ⏳ Pending |
| **10** | Email notifications not wired | No order confirmation, payment failure, or refund emails. | Add Resend integration in `lib/email/service.ts` and call from checkout/payment actions. | ⏳ Pending |

*Only Bugs 1 and 2 have been resolved in this session. The remaining bugs follow the sequential order 3 → 9.*

---

## Skipped Documentation Steps
*(Items listed in the project docs that were not yet implemented.)*

| Doc | Skipped step | Why it matters |
|-----|--------------|----------------|
| **ENVIRONMENT_SETUP.md** | Set up authentication (Better Auth) – migrations & cookie handling. | Auth is the gateway for all protected routes. |
| | Integrate payment gateways (JazzCash, EasyPaisa). | Required for prepaid orders; stubs only currently. |
| | Build cart & checkout flow with Supabase persistence. | Cart loss on refresh; checkout needs real order creation. |
| | Configure email notifications (Resend). | Acceptance criteria require order/payment/ refund emails. |
| **IMPLEMENTATION_PLAN.md** | Cart persistence across sessions (database‑backed cart, guest‑to‑account merge). | Directly related to Bug 6. |
| | Inventory reservation during checkout (Redis/DB TTL). | Prevents overselling; needed for checkout flow. |
| | Bundle offers UI + pricing‑lock logic. | Feature defined in spec but UI not exposed. |
| | Admin audit‑log writing from actions. | Required for compliance & debugging. |
| **AUTH_SETUP.md** | Apply database migrations (001‑005). | Same as pre‑condition #1. |
| **AUTHENTICATION_COMPLETE.md** | Cart persistence after auth migration. | Same as above. |
| | Checkout flow – order creation + payment‑integration prep. | Blocks live checkout experience. |
| **E2E_TESTING.md** | Run e2e tests after DB seeded & migrations applied. | Needed to validate critical flows (browse → cart → checkout → confirmation). |
| **RESEARCH_FINDINGS.md** | Daily low‑stock digest email. | Nice‑to‑have but listed as pending. |
| | Product recommendations bundle offers. | Not yet implemented. |

---

## Next Actions
1. **Verify the remaining pre‑conditions** (env vars, `'use server'` pragma, Better‑Auth middleware cookie, server‑client usage).  
2. **Start the sequential bug‑fix workflow** at **Bug 3** (Signup POST). After each bug is marked “done”, move to the next.  
3. **Apply the skipped documentation steps** once all seven core bugs are resolved:  
   * Wire cart persistence, payment integration, email notifications, bundle offers, admin audit logs, and run the E2E suite.  
4. **Finalize and deploy** to production (Vercel) after passing `npm run build`, `npm run lint`, and `npm run test:e2e`.

---
*Document generated on **2026‑08‑24** for the Muskan Care Center (MStore) codebase.*