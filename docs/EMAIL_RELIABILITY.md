# Email Reliability (P1)

The email system was audited in P1 and consolidated into a single reliable path.

## Single production path

`lib/email/delivery.ts` → `logAndSendEmail(opts)` is the **only** code that sends
transactional email. Domain functions in `server/actions/email.ts`
(`sendOrderConfirmation`, `sendPaymentStatusEmail`, `sendRefundEmail`,
`sendShipmentStatusEmail`) and the low-stock digest cron all call it.

The previously divergent implementation (`app/actions/send-email.ts`) was removed;
`logEmailSent` in `lib/supabase/helpers.ts` was removed for the same reason.

## Delivery tracking (`email_logs`)

Every send records a row:

- `status`: `pending` → `sent` | `failed` | `bounced`
- `idempotency_key`: unique (nullable). Identical keys never produce a second send.
- `html_body`: retained so the retry worker can resend without re-rendering.
- `retry_count`, `max_retries` (default 3), `next_retry_at`, `message_id`.

Admin visibility: `GET /api/admin/email-logs?referenceId=<orderId>` (admin-gated),
rendered in the admin order detail page.

## Retry (cron)

`app/api/cron/email-retry/route.ts` (`?secret=CRON_SECRET`) calls
`retryFailedEmails()`, which selects `failed`/`pending` rows whose
`next_retry_at` has elapsed and re-invokes `logAndSendEmail`.

- Backoff: 5m, 10m, 20m … capped at 12h (exponential), within 24h.
- After `max_retries` attempts the row is left `failed` and an
  `admin_audit_logs` entry (`email_delivery_failed`) alerts admins.

## Idempotency

- Order confirmation: `order:<id>:confirmation`
- Refund: `refund:<id>:<status>`
- Shipment: `shipment:<id>:<status>`
- Low-stock digest: `low_stock_digest:<YYYY-MM-DD>` (one per day)

## Deduplication (webhooks)

`lib/email/webhook-dedup.ts` → `shouldSendWebhookEmail` uses a single atomic
`INSERT` against `webhook_email_tracking` (unique on
`order_id, transaction_id, payment_gateway, email_type, webhook_hash`).

- Unique violation → returns `false` (suppress duplicate).
- Any other DB error → **fail closed** (returns `false`), not fail open.

## Bounce / invalid recipient (Resend)

`app/api/webhooks/email/route.ts` handles Resend's documented webhook contract
(`email.bounced` / `email.complained` / `email.delivered`). On bounce/complaint
it marks the matching `email_logs` row `bounced` and increments
`recipient_bounce_tracking`. After **3** bounces the recipient is flagged
`marked_invalid` and an admin audit event is written. If `RESEND_WEBHOOK_SECRET`
is set, the `Resend-Signature` HMAC is verified.

## Inventory reservation TTL

`inventory_reservations` rows are created at order time with
`expires_at = now() + 30min`. `app/api/cron/release-reservations/route.ts`
(`?secret=CRON_SECRET`) marks `reserved` rows past `expires_at` as `expired`, so
`finalizeInventory` (which only acts on `reserved`) can no longer decrement
stock for abandoned orders. This prevents reservations from permanently locking
inventory.

## Provider reliability

Both Resend and SendGrid fetches use a 10s `AbortSignal.timeout`.

## Cron scheduling

All three cron endpoints must be triggered by the same external scheduler used
for the low-stock digest, e.g.:

```
GET /api/cron/low-stock-digest?secret=$CRON_SECRET
GET /api/cron/email-retry?secret=$CRON_SECRET        # every 5–10 min
GET /api/cron/release-reservations?secret=$CRON_SECRET  # every 5–10 min
```
