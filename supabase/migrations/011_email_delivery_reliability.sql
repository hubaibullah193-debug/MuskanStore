-- P1: Email delivery reliability
-- Adds retry scheduling, idempotency, and bounce/invalid-recipient tracking
-- to the existing email system. No existing data is modified; only additive
-- schema changes are made.

-- 1. Extend email_logs for retry scheduling + send idempotency + body retention
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS html_body TEXT;

-- Unique idempotency key. Postgres does not treat NULLs as equal, so emails
-- without an idempotency key (e.g. webhook-driven payment emails, which are
-- deduplicated at the webhook layer) remain allowed to create multiple rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_idempotency
  ON public.email_logs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Retry worker selection: status pending/failed whose backoff window has passed
CREATE INDEX IF NOT EXISTS idx_email_logs_retry
  ON public.email_logs (status, next_retry_at);

-- 2. Bounce / invalid-recipient tracking (per spec: 3 bounces => mark invalid)
CREATE TABLE IF NOT EXISTS public.recipient_bounce_tracking (
  recipient_email   TEXT PRIMARY KEY,
  bounce_count      INTEGER NOT NULL DEFAULT 0,
  last_bounce_at    TIMESTAMPTZ,
  marked_invalid    BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER recipient_bounce_tracking_updated_at
  BEFORE UPDATE ON public.recipient_bounce_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
