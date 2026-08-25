# MStore — Remaining Work & Audit

**Audit date:** static audit (type-check + lint + build + full source/migration/doc review)
**Scope:** compare `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`, specs, and ACTUAL source code, DB migrations, config, and tests.
**Rule applied:** every claim verified against real code, not stale docs.

> **Headline:** The documentation (`AGENTS.md`, `README.md`) materially **under‑reports** the real implementation. Several items listed as "broken" / "known issues" / "not built" are **stale/false**. The code is more complete and more secure than the docs claim. Genuine gaps are concentrated in (a) prepaid payments, (b) bundle purchase flow, (c) ops/scheduling config, and (d) documentation drift + dead migration artifacts.

> **Phase 1 (production/launch readiness) — COMPLETED (this pass):**
> - CODE FIXES: `vercel.json` now schedules `email-retry` + `release-reservations` crons (P1-5 done); new migration `012_fix_users_read_own_policy.sql` removes the admin-profile leak from `users_read_own` (pulled forward from P3-5 per security review); `AGENTS.md` + `README.md` + `.env.example` corrected to remove false "broken" claims (signup GET bug, `decodeJwt`, duplicate `app/middleware.ts`, `/api/payment/verify` references) and reflect the real migration set (000–012).
> - EXTERNAL (unchanged, still required): apply migrations to a live Supabase project (P1-2), run `npm run provision-admin <email>` (P1-3), configure `RESEND_API_KEY` + verified domain (P1-4), and integrate live JazzCash/Easypaisa credentials + register webhooks (P1-6). These cannot be performed from the repo alone.
> - Remaining later-phase work is unchanged below.

> **Phase 2 (Features & Hardening) — COMPLETED (this pass):**
> - P2-1 (bundles purchasable + server-side price lock): `lib/orders/bundle-pricing.ts` (authoritative `lockBundlePrice`, `assertBundlePurchasable`, `buildBundleOrderItem`); `server/actions/orders.ts:createOrder` resolves bundle from DB by `bundle_id` only (client price/contents ignored), reserves each constituent; migration `013_bundle_cart_support.sql` adds `cart_items.bundle_id` + `bundle_items_snapshot`; `app/components/bundle-add-to-cart-button.tsx`, `app/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/components/cart-item.tsx`, `lib/hooks/useCart.ts` all bundle-aware; `lib/validation/schemas.ts:CheckoutItemSchema` is a union.
> - P2-2 (stale `/api/payment/verify` refs): removed from `test_all_pages.py` + `test_all_pages_v2.py`; `docs/PAYMENT_ARCHITECTURE.md` documents the real webhook-only verification flow. (README/.env already corrected in P1.)
> - P2-3 (security headers/CSP): `lib/security/headers.ts` (`buildSecurityHeaders`: CSP allowing Next inline scripts/styles, Supabase REST+Realtime, payment `form-action`; plus HSTS, nosniff, Referrer-Policy, X-Frame-Options=DENY, Permissions-Policy). `middleware.ts` applies these on every response path (admin API 401, redirects, next()).
> - P2-4 (gateway params): kept fail-closed; documented as EXTERNAL — exact JazzCash/Easypaisa field values must be confirmed against merchant docs before go-live. No code guessing.
> - P2-5 (refund payout + admin notify): `requestRefund` in `server/actions/orders.ts` rewritten — ownership + delivered-only check, idempotency on `refunds`, creates real `refunds` row (`status='requested'`), sets `order_status='refund_requested'`, sends customer email + `sendRefundAdminNotification`, audit log. No `refund_method`/`refund_account` (those columns don't exist; payout captured at admin processing). Removed dead `RefundRequestSchema`.
> - P2-6 (automated tests): added `vitest` + `vitest.config.mjs` + `tests/unit/*` (bundle pricing price-lock / inactive-expired / tamper resistance, security headers, helpers). `npm run test:unit` → 22 passing. E2E still requires a live server + seeded DB (external).
> - P2-7 (SEO): added `app/robots.ts` (disallows admin/account/orders/api/auth/checkout/order-confirmation) + `app/sitemap.ts` (static routes + live product slugs). Build emits `/robots.txt` + `/sitemap.xml`.
> - P2-8 (password reset): verified correct — `requestPasswordReset` uses Supabase `resetPasswordForEmail` with `redirectTo`; `confirmPasswordReset` verifies the token server-side. No code change. Live Supabase email/redirect remains EXTERNAL verification.
> - Gates: `npm run type-check`, `npm run lint`, `npm run build` all pass; `npm run test:unit` 22/22 pass.

> **Phase 3 (Hygiene & Consolidation) — COMPLETED (this pass):**
> - P3-1 (dead migration artifacts): removed the legacy root `migrations/` folder and `supabase/combined_migration.sql` + `supabase/fix_bundles_and_rls.sql`. Only `supabase/migrations/` remains (canonical).
> - P3-2 (migration numbering): renumbered into a clean monotonic `000`→`014` sequence (the former colliding `009_secure_admin_provisioning.sql` is now `010`; subsequent files shifted +1). `AGENTS.md`/`README.md` updated. NOTE: migrations have never been applied to a live DB, so renaming is safe; do not rename again once a DB has been migrated.
> - P3-3 (duplicate `logoutAction`): removed the copy in `server/actions/auth.ts` and re-exported the canonical `logoutAction` from `app/auth/actions.ts`; both callers (`lib/hooks/useAuth.ts`, `app/admin/layout-client.tsx`) unchanged.
> - P3-4 (admin-auth helpers): `lib/auth/admin.ts:isAdmin()` now delegates to the canonical `verifyAdminAccess()` in `server/actions/auth.ts` (single token-verify + role logic).
> - P3-6 (unused `better-auth`): removed the dependency from `package.json` + lockfile (zero imports).
> - P3-7 (doc path error): `AGENTS.md` corrected `hooks/useAuth.tsx` → `lib/hooks/useAuth.ts`.
> - P3-8 (bundle admin audit attribution): `createBundle`/`updateBundle`/`deleteBundle` (and `bulkUploadProducts`) now resolve the acting admin id from the session via `verifyAdminAccess()` instead of trusting the literal `'admin'` passed by the client; client pages updated to drop the arg. Also added an admin-authorization guard to those actions.
> - P3-9 (dual audit writers): `server/actions/audit.ts:logAudit` now delegates to the canonical `logAuditEvent` (`lib/supabase/helpers.ts`); the DB insert lives in one place.
> - P3-5 (users_read_own RLS) and P3-10 (robots/sitemap) were already completed in Phases 1/2.
> - Gates: `npm run type-check`, `npm run lint`, `npm run build` all pass; `npm run test:unit` 22/22 pass.

---

## Launch readiness verdict

- **Can launch a COD‑only MVP** after P1 ops tasks: apply migrations, provision one admin, configure Resend, and schedule the two missing crons.
- **Prepaid (JazzCash/Easypaisa) is not launch‑ready** without live gateway credentials, merchant onboarding, and webhook/IPN registration.
- **Static quality gates pass:** `tsc --noEmit` clean, `next lint` clean, `next build` succeeds (46 routes).

---

## Phased task breakdown

Each task: `ID | Priority | Title | Evidence / Files | Action`.

### Phase 1 — Launch blockers & truth (P1/P0)

| ID | P | Title | Evidence / Files | Action |
|----|---|-------|------------------|--------|
| P1-1 | P1 | Rewrite stale documentation | `AGENTS.md` ("Not Built" list), `README.md` ("Known issues") — claims signup GET bug, `decodeJwt` unverified auth, duplicate `app/middleware.ts` are all **false** | Rewrite both files to reflect verified status; remove false "broken" claims |
| P1-2 | P1 | Apply Supabase migrations | `supabase/migrations/000–014` (never run in this audit; renumbered in Phase 3) | `supabase db push` (or run ordered files) on target project; seed `002`/`006` |
| P1-3 | P1 | Provision first admin | `scripts/provision-admin.mjs`, `supabase/migrations/009_secure_admin_provisioning.sql` (`provision_admin()`) | `npm run provision-admin <email>` after migrations |
| P1-4 | P1 | Configure transactional email | `lib/email/delivery.ts` (single path), `.env.example` (`RESEND_API_KEY`, `EMAIL_FROM`) | Set key + verify sender domain; set `RESEND_WEBHOOK_SECRET` |
| P1-5 | P1 | Schedule missing crons | `vercel.json` (only `low-stock-digest`); `app/api/cron/release-reservations`, `app/api/cron/email-retry` exist but unscheduled | Add `release-reservations` + `email-retry` to `vercel.json` crons (or GitHub Actions) so inventory auto‑releases & failed emails retry |
| P1-6 | P1 | Live prepaid integration (if prepaid is a launch req) | `lib/payments/url-generators.ts`, `app/api/payment/callbacks/*`, `app/api/webhooks/*` (scaffolding, fail‑closed HMAC) | Obtain `JAZZ_CASH_INTEGRITY_SALT`/`EASYPAISA_SECRET`; register IPN URLs; E2E one live transaction |

### Phase 2 — Features & hardening (P2)

| ID | P | Title | Evidence / Files | Action |
|----|---|-------|------------------|--------|
| P2-1 | P2 | Make bundles purchasable (price lock) | `app/page.tsx:258-318` displays bundles; `server/actions/orders.ts:createOrder` has **no bundle concept**; no add‑to‑cart for bundles | Add bundle→cart mapping; apply `bundle_price` server‑side in `createOrder` |
| P2-2 | P2 | Remove doc‑only endpoint reference | `README.md`, `.env.example` reference `app/api/payment/verify/route.ts` which does **not exist** (design uses `/api/webhooks/{gateway}`) | Delete the stale reference; document actual webhook flow |
| P2-3 | P2 | Add security headers / CSP | `app/layout.tsx`, `middleware.ts` set none | Add `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy` in `middleware.ts` |
| P2-4 | P2 | Confirm gateway field/param values | `lib/payments/url-generators.ts:78-83` (`pp_TxnType:'MPAY'`), `:141-158` (Easypaisa field order) flagged "confirm vs merchant PDF" | Verify exact values with gateway merchant docs before go‑live |
| P2-5 | P2 | Implement refund payout + admin notify | `server/actions/orders.ts:455-457` placeholders (`bank_transfer`/`pending`); `requestRefund` `// TODO: Send email to admin` (line 508) | Add real payout fields; send admin notification on new request |
| P2-6 | P2 | Add automated tests | only `e2e/homepage.spec.ts`, `e2e/auth.spec.ts` | Add unit tests for `createOrder`, server‑side pricing, RLS; run E2E vs live seeded DB |
| P2-7 | P2 | SEO/agentic discovery | no `robots.txt` / `sitemap.xml` | Add both |
| P2-8 | P2 | Password‑reset verification | relies on Supabase Auth `resetPasswordForEmail` (outside reliability layer) | Confirm reset email + redirect template in live Supabase |

### Phase 3 — Hygiene & consolidation (P3)

| ID | P | Title | Evidence / Files | Action |
|----|---|-------|------------------|--------|
| P3-1 | P3 | Delete dead/duplicate migration artifacts | `migrations/` (legacy), `supabase/combined_migration.sql`, `supabase/fix_bundles_and_rls.sql` | **DONE** — removed; only `supabase/migrations/` remains |
| P3-2 | P3 | Fix migration numbering | two `009_*` files; README said "apply 000→009" but `010`,`011` exist | **DONE** — renumbered to clean `000`→`014`; docs updated |
| P3-3 | P3 | Remove duplicate `logoutAction` | `app/auth/actions.ts` AND `server/actions/auth.ts` | **DONE** — kept canonical in `app/auth/actions.ts`, re-exported from `server/actions/auth.ts` |
| P3-4 | P3 | Unify admin‑auth helpers | `verifyAdminAccess()` vs `isAdmin()` | **DONE** — `isAdmin()` delegates to `verifyAdminAccess()` |
| P3-5 | P3 | Tighten `users_read_own` RLS | `role='admin'` OR clause | **DONE in Phase 1** (migration `013_fix_users_read_own_policy.sql`) |
| P3-6 | P3 | Remove unused `better-auth` dependency | `package.json` | **DONE** — removed dep + lockfile entry |
| P3-7 | P3 | Fix doc path errors | `AGENTS.md` `hooks/useAuth.tsx` | **DONE** — corrected to `lib/hooks/useAuth.ts` |
| P3-8 | P3 | Fix bundle admin audit attribution | `app/admin/bundles/page.tsx` + `app/admin/products/page.tsx` pass literal `'admin'` | **DONE** — server actions resolve real admin id from session; added auth guard |
| P3-9 | P3 | Consolidate dual audit writers | `logAudit` vs `logAuditEvent` | **DONE** — `logAudit` delegates to `logAuditEvent` |
| P3-10 | P3 | Add robots/sitemap | see P2-7 | **DONE in Phase 2** |

---

## Detailed findings (7 categories)

### 1. 🔴 BROKEN
**None confirmed in code.** Historically‑cited bugs are stale/false:

- **Signup "GET instead of POST"** — `app/auth/signup/page.tsx:55-110` uses `onSubmit` → `e.preventDefault()` → `signUpAction`. Works.
- **Unverified `decodeJwt` auth** — `app/api/checkout/route.ts:67` and `server/actions/orders.ts:327` both call `verifySupabaseToken` (jose/JWKS). Grep `decodeJwt`/`jwt-decode` → 0 matches.
- **Duplicate `app/middleware.ts`** — glob shows it does **not exist**; only root `middleware.ts` (uses `verifySupabaseToken`).

### 2. 🚨 CRITICAL / LAUNCH BLOCKERS
- Prepaid payments not integrated (COD works). *P1 (external).*
- Cron scheduling incomplete (`vercel.json` only `low-stock-digest`; `release-reservations` + `email-retry` unscheduled). *P1.*
- Migrations not applied; admin not provisioned; Resend unverified. *P1 (external).*
- RLS/code itself is launch‑ready — no critical auth hole found.

### 3. 🟡 INCOMPLETE / PARTIAL
- Bundle admin audit attribution uses literal `'admin'`. *P3.*
- Two parallel audit‑write paths. *P3.*
- Password‑reset email via Supabase Auth (outside reliability layer, acceptable). *P2 — verified complete, external live check only.*

### 4. ❌ MISSING
- Real gateway transaction lifecycle. *P1 (external).*
- Self‑service admin UI (by design). *—.*

> **Resolved in Phase 2:** bundles are now purchasable with server‑side price lock; refund request creates a real `refunds` row + admin notify (no placeholder payout fields); storefront bundle purchase action added; `/api/payment/verify` reference removed (webhooks only); unit tests added (`vitest`, 22 passing); CSP/security headers added; `robots.txt` + `sitemap.xml` added.

### 5. ⚠️ NEEDS IMPROVEMENT
- Docs massively out of sync. *P1.* (Substantially corrected across Phases 1–3; minor legacy doc references in `docs/*.md` may still cite old migration filenames — external cleanup.)
- Dead/duplicate migration artifacts. *RESOLVED in Phase 3 (P3-1).*
- Migration numbering. *RESOLVED in Phase 3 (P3-2) — now clean `000`→`014`.*
- Duplicate `logoutAction`; dual admin‑auth helpers. *RESOLVED in Phase 3 (P3-3, P3-4).*
- RLS leaks admin user rows. *RESOLVED (Phase 1, migration `013`).*
- Unused `better-auth` dependency. *RESOLVED in Phase 3 (P3-6).*
- AGENTS.md path errors (`hooks/useAuth.tsx`). *RESOLVED in Phase 3 (P3-7).*
- Gateway field/param confirmation flagged in code. *P2 (external).*

### 6. ⏳ EXTERNAL VERIFICATION REQUIRED
- Supabase migrations on a clean DB (files internally consistent, unexercised).
- Live prepaid payment lifecycle (webhooks + callbacks + amount verification) — code path `app/api/webhooks/jazz-cash/route.ts` is robust (signature + amount check, dedup, inventory finalize, email).
- Resend delivery + bounce webhook (needs key + verified domain + `RESEND_WEBHOOK_SECRET`).
- Admin provisioning run (`npm run provision-admin`).
- E2E Playwright specs not executed (no live app + seeded DB). `data-testid` attributes (`product-card`, `cart-link`, `cart-badge`, `cart-item`) ARE present → specs plausibly runnable.
- Production deploy (build passes locally; runtime unverified).
- RLS under real anon/authenticated clients (policies read correct, unexercised).
- Inventory auto‑release + email‑retry cron execution.

### 7. ✅ COMPLETE & VERIFIED
Verified by static checks + source review:

- **Build/Lint/Types:** `tsc --noEmit` clean; `next lint` clean; `next build` succeeds (46 routes).
- **Auth:** signup/login/logout/session; JWT verified via `verifySupabaseToken` (jose/JWKS).
- **RLS:** `ENABLE ROW LEVEL SECURITY` on all 19 tables (`000:480-498`); admin unified on `public.is_admin()` via `008` (proper `DROP … IF EXISTS` + recreate).
- **Route protection:** single root `middleware.ts` with role checks (`/admin`, `/account`, `/orders`, `/api/admin`).
- **COD checkout + order lifecycle:** `createOrder` server‑side price calc, idempotency key, inventory reservation (30‑min TTL), immediate COD finalization, shipment auto‑create, confirmation email.
- **Cart:** guest + signed‑in + guest→account merge, server‑side validation; `validateCartInventory` pre‑checkout.
- **Recommendations:** detail `getRelatedProducts` + cart `getCartRecommendations` (P2).
- **Admin dashboard:** sparklines (14‑day orders/revenue) + order‑status & payment‑method distribution bars (P2).
- **Email reliability:** `logAndSendEmail` single path — idempotency, exponential‑backoff retries, `email_logs`, 3‑bounce invalidation, webhook dedup (`lib/email/delivery.ts`).
- **Inventory finalization + release‑reservations + email‑retry crons** (code present).
- **Storage image upload:** `uploadProductImage` + migration `011` bucket/public‑read policy.
- **Audit logging:** products, inventory, orders, bundles, settings, refunds, shipments (corrects "gap" claim).
- **Refund admin flow:** approve/reject/complete + API routes, ownership checks, emails, audit.
- **Secure admin provisioning:** `provision_admin()` SECURITY DEFINER + EXECUTE revoked from public; no self‑escalation (`009`).
- **Responsive/mobile UX:** header/footer/products/admin/checkout/account/cart‑item (P2).
- **Phase 2 (this pass):** bundles fully purchasable with server‑side `bundle_price` lock (`lib/orders/bundle-pricing.ts`); security headers/CSP (`lib/security/headers.ts` + `middleware.ts`); `docs/PAYMENT_ARCHITECTURE.md` (webhook‑only verification); `requestRefund` real `refunds` row + admin notify + audit; `vitest` unit tests (22 pass); `app/robots.ts` + `app/sitemap.ts`.

### 7b. ✅ PHASE 2 VERIFICATION LOG (this pass)
| Check | Command | Result |
|-------|---------|--------|
| Type‑check | `npm run type-check` | ✅ clean |
| Lint | `npm run lint` | ✅ clean |
| Build | `npm run build` | ✅ compiled (includes `/robots.txt` + `/sitemap.xml`) |
| Unit tests | `npm run test:unit` | ✅ 22 passed (bundle pricing, security headers, helpers) |
| Source review | manual (bundle price lock, refund flow, headers, dead‑code removal) | see Phase 2 block above |

### 7c. ✅ PHASE 3 VERIFICATION LOG (this pass)
| Check | Command | Result |
|-------|---------|--------|
| Type‑check | `npm run type-check` | ✅ clean |
| Lint | `npm run lint` | ✅ clean |
| Build | `npm run build` | ✅ compiled (46 routes) |
| Unit tests | `npm run test:unit` | ✅ 22 passed |
| Source review | manual (logoutAction re‑export, isAdmin delegate, logAudit delegate, session‑resolved admin id in bundle/product actions, removed dead artifacts + better‑auth, renumbered migrations) | see Phase 3 block above |

---

## Verification log (this audit)

| Check | Command | Result |
|-------|---------|--------|
| Type‑check | `npm run type-check` | ✅ clean |
| Lint | `npm run lint` | ✅ "No ESLint warnings or errors" |
| Build | `npm run build` | ✅ compiled, 46 routes generated |
| Source review | manual (auth, orders, products, payments, email, RLS, admin) | see findings above |

**No files were modified, committed, or pushed during this audit.**
