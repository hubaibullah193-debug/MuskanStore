# E-Commerce Research Findings — Muskan Care Center
**One-Page Research Summary** | Personal Hygiene Products Store for Pakistan

---

## What Exists / Standard Patterns

**Typical e-commerce architecture** for ~1000s products, ~100s daily orders uses: Next.js frontend + PostgreSQL backend + Elasticsearch/Algolia for search + transactional email service + payment gateway SDKs. At your scale, this is overkill; most companies solve this with simpler patterns.

**Standard customer journey**: Browse → Search/Filter → View Details → Cart → Checkout (3-4 steps) → Payment (external gateway or embedded) → Order Confirmation → Tracking.

**Standard admin workflow**: Product catalog (CRUD, bulk edit) → Inventory management → Order management (filter, fulfill, refund) → Customer service lookup.

**Key infrastructure patterns**:
- Inventory reservations with TTL (hold items during checkout, auto-release after 15 min)
- State machines for orders (pending → confirmed → shipped → delivered) and payments (pending → processing → paid/failed)
- Webhooks for payment confirmation (gateway calls you; you update order status)
- Transactional emails (order confirmation, shipping, delivery)
- Row-level security (RLS) for multi-role access (customer sees own orders, admin sees all)

---

## Main Implementation Options & Trade-Offs

| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| **Search** | PostgreSQL FTS (no external dependency) | Elasticsearch (powerful but ops overhead) | Algolia/Meilisearch (managed, $) |
| **Cart** | Session-based (localStorage) | Database-backed per user | Redis hybrid (cache + DB) |
| **Checkout Flow** | Single-page | 3-4 step wizard ← **recommended** | Progressive disclosure |
| **COD Verification** | Trust model (none) | Phone OTP + address validation ← **recommended** | Risk-based gating |
| **Payment Method** | Redirect to gateway | API + iframe | Native SDK (mobile only) |
| **Auth** | Email/password | Passwordless + Social ← **recommended** | Federated auth |
| **Bundles** | Logical (DB + app logic) ← **recommended** | Reserved inventory | Snapshot copies |
| **Admin Panel** | Scaffolded CRUD (Nova/Strapi) | Custom React dashboard | Hybrid (CRUD + custom) |
| **Email** | Transactional service ($10-30/mo) ← **recommended** | Self-hosted (free, ops cost) | Hybrid for scale |

**Your scale verdict**: Start simple—PostgreSQL FTS, session carts, 3-step checkout, phone OTP for COD, redirect payment flow, passwordless auth, logical bundles. Add complexity only when metrics show bottlenecks.

---

## What Your Existing Project Already Supports

✅ **Next.js App Router** — handles Server Components, Server Actions (ideal for secure payment/order operations), and API routes  
✅ **Supabase (PostgreSQL)** — relational data model fits e-commerce perfectly; RLS policies already available for role-based access  
✅ **Better Auth** — can extend with customer + admin roles; session management is ready  
✅ **Admin panel & dashboard** — already exists; reuse for order management, inventory, refunds  
✅ **7 customer-facing pages** — can accommodate: Home, Browse/Search, Product Detail, Cart, Checkout (split into address/payment substeps or one page), Order Confirmation, Order Tracking  
✅ **Email integration** — existing; extend for order events (confirmation, shipping, delivery)  
✅ **Payment methods** — COD, JazzCash, Easypaisa are all feasible with Supabase + Server Actions + webhooks  
✅ **Bundle offers** — database modeling straightforward (bundles table + bundle_items join)

---

## Critical Decisions Needed (Before Spec)

1. **Cart persistence**: Session-based (simplest, mobile-only) or database-backed (better UX, cross-device)?
2. **Checkout flow**: Single-page or 3-4 step wizard? (3-step recommended: cart review → address → payment)
3. **COD verification**: Phone OTP only, or OTP + address validation?
4. **Search UX**: Database-only (good for 1000s products) or need Elasticsearch later?
5. **Admin reporting**: Real-time dashboards or daily/hourly aggregates?
6. **Refund policy**: Full refund only, or partial/store credit support?
7. **Order state machine**: Just payment states (pending/paid) or detailed fulfillment states (processing/shipped/delivered)?
8. **Inventory model**: Simple stock count, or SKU variants (size/color)?
9. **Payment reconciliation**: Hourly, daily, or only on-demand?
10. **Security**: RLS-enforced everywhere, or trust app layer for some queries?

---

## What Still Needs Discovery

- **JazzCash & Easypaisa API details**: Exact webhook signatures, retry behavior, timeout thresholds (varies by provider version)
- **Delivery partner integrations**: If outsourcing COD collection + delivery (TCS, Leopards), need their APIs for serviceability, tracking, payment reconciliation
- **Pakistan-specific logistics**: Postal code coverage, address formats per region, delivery time SLAs
- **Volume scaling**: 1000s → 10K+ daily orders; need to profile where bottlenecks occur (inventory queries? payment API latency? email sending?)
- **Regulatory requirements**: Any Pakistan-specific tax, payment, or data privacy rules for e-commerce?
- **Backup payment method**: If JazzCash/Easypaisa down, fallback to what?

---

## Failure Modes & Safeguards (Critical)

**Payment & Order**:
- Gateway timeout → Implement 3x retry with exponential backoff; store transaction ID immediately
- Duplicate orders → Idempotency key (UUID) + unique constraint (customer, key, date); client-side retry safe
- Payment confirmed but order not created → Wrap in transaction; reconciliation job queries gateway every hour

**Inventory**:
- Sold out during checkout → Inventory reservations with 15-min TTL; atomic deduction `UPDATE inventory SET stock = stock - qty WHERE stock >= qty`
- Bundle oversell → Bundle has separate stock; components deducted atomically on order

**Checkout**:
- Network interruption → Idempotency key + polling; client persists order intent to localStorage
- Session timeout → 30-min timeout for checkout; auto-refresh on activity; cart persisted to DB
- Invalid address → Server-side validation (phone format, city check, landmark if postal code missing)

**COD**:
- Unverified orders → Phone OTP + address verification reduces 70% of fraud
- Cash collection disputes → Reconciliation with delivery partner; store payment proof (receipt image)

**See RESEARCH_FINDINGS_DETAILED.md for 20+ edge cases with code patterns.**

---

## Recommendation

Start with a **simplest-viable model**: PostgreSQL FTS search, session carts, 3-step checkout, phone OTP for COD, redirect payment flow, passwordless auth. All fit squarely within Supabase + Better Auth + Next.js Server Actions. Build for ~100 orders/day, then profile and optimize.

**Next step**: Spec out the 7 customer-facing pages, then model the data schema (products, orders, payments) to validate feasibility.

