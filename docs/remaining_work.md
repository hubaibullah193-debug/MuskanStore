# MStore — Remaining Work & Audit

**Audit date:** static audit (type-check + lint + build + full source/migration/doc review)
**Scope:** compare `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`, specs, and ACTUAL source code, DB migrations, config, and tests.
**Rule applied:** every claim verified against real code, not stale docs.

> **Headline:** The documentation (`AGENTS.md`, `README.md`) materially **under‑reports** the real implementation. Several items listed as "broken" / "known issues" / "not built" are **stale/false**. The code is more complete and more secure than the docs claim. Genuine gaps are concentrated in (a) prepaid payments, (b) bundle purchase flow, (c) ops/scheduling config, and (d) documentation drift + dead migration artifacts.

> **Phase 1 (production/launch readiness) — COMPLETED (this pass):**
> - CODE FIXES: `vercel.json` now schedules `email-retry` + `release-reservations` crons (P1-5 done); new migration `012_fix_users_read_own_policy.sql` removes the admin-profile leak from `users_read_own` (pulled forward from P3-5 per security review); `AGENTS.md` + `README.md` + `.env.example` corrected to remove false "broken" claims (signup GET bug, `decodeJwt`, duplicate `app/middleware.ts`, `/api/payment/verify` references) and reflect the real migration set (000–012).
> - EXTERNAL (unchanged, still required): apply migrations to a live Supabase project (P1-2), run `npm run provision-admin <email>` (P1-3), configure `RESEND_API_KEY` + verified domain (P1-4), and integrate live JazzCash/Easypaisa credentials + register webhooks (P1-6). These cannot be performed from the repo alone.
> - Remaining later-phase work is unchanged below.

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
| P1-2 | P1 | Apply Supabase migrations | `supabase/migrations/000–011` (never run in this audit) | `supabase db push` (or run ordered files) on target project; seed `002`/`006` |
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
| P3-1 | P3 | Delete dead/duplicate migration artifacts | `migrations/` (legacy), `supabase/combined_migration.sql`, `supabase/fix_bundles_and_rls.sql` | Remove or quarantine; keep only `supabase/migrations/` |
| P3-2 | P3 | Fix migration numbering | two `009_*` files; `008` internally commented `014_unify_admin_rls_role.sql`; README says "apply 000→009" but `010`,`011` exist | Renumber sequentially; update README |
| P3-3 | P3 | Remove duplicate `logoutAction` | `app/auth/actions.ts:191` AND `server/actions/auth.ts:12` | Keep one; delete the other |
| P3-4 | P3 | Unify admin‑auth helpers | `verifyAdminAccess()` (`server/actions/auth.ts:32`) vs `isAdmin()` (`lib/auth/admin.ts:11`) | Consolidate on a single helper |
| P3-5 | P3 | Tighten `users_read_own` RLS | `supabase/migrations/000:508-512` `auth.uid()=id OR role='admin'` leaks admin profiles to all authenticated users | Drop `role='admin'` OR clause |
| P3-6 | P3 | Remove unused `better-auth` dependency | `package.json:18`; zero imports confirmed | Remove from deps |
| P3-7 | P3 | Fix doc path errors | `AGENTS.md` references `hooks/useAuth.tsx` (actual `lib/hooks/useAuth.ts`) | Correct path |
| P3-8 | P3 | Fix bundle admin audit attribution | `app/admin/bundles/page.tsx:130,142` pass literal `'admin'` as `adminId` | Pass real admin id from session |
| P3-9 | P3 | Consolidate dual audit writers | `server/actions/audit.ts:logAudit` (refunds/shipments) vs `lib/supabase/helpers.ts:logAuditEvent` (products/inventory/orders/bundles/settings) | Single helper, consistent shape |
| P3-10 | P3 | Add robots/sitemap | see P2-7 | see P2-7 |

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
- Bundles: displayed on homepage, **not purchasable** (no checkout price‑lock). *P2.*
- Bundle admin audit attribution uses literal `'admin'`. *P3.*
- Refund request uses placeholder payout fields + missing admin notify. *P3.*
- Two parallel audit‑write paths. *P3.*
- Password‑reset email via Supabase Auth (outside reliability layer, acceptable). *P2.*

### 4. ❌ MISSING
- Storefront bundle purchase action. *P2.*
- `app/api/payment/verify/route.ts` — referenced in docs/env, **never existed** (webhooks used instead). *P2 (doc fix).*
- Real gateway transaction lifecycle. *P1 (external).*
- Self‑service admin UI (by design). *—.*
- Automated tests beyond 2 E2E specs. *P2.*
- CSP/security headers. *P2.*
- robots.txt / sitemap.xml. *P3.*

### 5. ⚠️ NEEDS IMPROVEMENT
- Docs massively out of sync. *P1.*
- Dead/duplicate migration artifacts (`migrations/`, `combined_migration.sql`, `fix_bundles_and_rls.sql`). *P2.*
- Migration numbering chaos (two `009`s; README "000→009" but up to `011`). *P3.*
- Duplicate `logoutAction`; dual admin‑auth helpers. *P3.*
- RLS leaks admin user rows (`users_read_own` `role='admin'` OR). *P3.*
- Unused `better-auth` dependency. *P3.*
- AGENTS.md path errors (`hooks/useAuth.tsx`). *P3.*
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

---

## Verification log (this audit)

| Check | Command | Result |
|-------|---------|--------|
| Type‑check | `npm run type-check` | ✅ clean |
| Lint | `npm run lint` | ✅ "No ESLint warnings or errors" |
| Build | `npm run build` | ✅ compiled, 46 routes generated |
| Source review | manual (auth, orders, products, payments, email, RLS, admin) | see findings above |

**No files were modified, committed, or pushed during this audit.**
