# Payment Architecture (as built)

> This documents the **actual** payment flow in MStore. It is intentionally
> fail-closed: no payment is ever considered "paid" without a verified
> server-side event. Placeholder/verify endpoints are intentionally absent.

## Flow

1. **Checkout** (`app/checkout/page.tsx` → `app/api/checkout/route.ts`)
   - Client sends cart lines (product/variant or bundle id + qty). **Prices are
     never trusted from the client** — the order is priced server-side in
     `server/actions/orders.ts` (`createOrder`) using DB values only.
   - Server computes subtotal (bundle price locked via
     `lib/orders/bundle-pricing.ts` → `lockBundlePrice`), applies
     `TAX_RATE = 0.17`, `DELIVERY_FEE = 300`, `PAYMENT_FEE = 0` (cod), and
     reserves inventory (30-min TTL, auto-released by
     `app/api/cron/release-reservations`).
   - Returns `{ order_id, amount }`. Order `payment_status = 'pending'`.

2. **Payment method selection**
   - `cod` — order is confirmed immediately; no gateway call.
   - `jazz_cash` / `easypaisa` — client is redirected to the gateway using a
     signed redirect URL (`lib/payments/url-generators.ts`). These are stubs:
     live merchant onboarding + credentials are required before real charging.

3. **Gateway callback / IPN (the only "verification" path)**
   - `app/api/payment/callbacks/jazz-cash/route.ts`
   - `app/api/payment/callbacks/easypaisa/route.ts`
   - `app/api/webhooks/jazz-cash/route.ts`
   - `app/api/webhooks/easypaisa/route.ts`
   - On a genuine gateway success event, the webhook **verifies the gateway
     signature** (`lib/payments/signature.ts`) and calls
     `finalizeInventoryPayment` (`lib/payments/inventory-finalization.ts`),
     which transitions `payment_status → 'paid'` and finalizes the
     reservation. There is **no public `/api/payment/verify` endpoint**;
     verification happens exclusively via signed gateway callbacks.

## Security notes
- All amounts/order totals are authoritative server-side. Client-supplied
  prices are ignored.
- Gateway webhooks must verify signatures before marking an order paid; an
  unverified or missing signature keeps the order `pending` (fail-closed).
- JazzCash/Easypaisa live integration (credentials, merchant registration,
  IPN registration) is the remaining external work item — not a code gap in
  the verification logic itself.

## Refunds
- Customer requests via `requestRefund` in `server/actions/orders.ts`
  (storefront `app/orders/[id]/page.tsx`). Creates a `refunds` row
  (`status='requested'`), sets order `order_status='refund_requested'`, emails
  the customer and notifies admin (`sendRefundAdminNotification`).
- Admin approves/rejects/completes via `app/admin/refunds` + API routes
  (`app/api/admin/refunds/*`). Payout method/account are captured at admin
  processing time; no client-controlled payout fields exist.
