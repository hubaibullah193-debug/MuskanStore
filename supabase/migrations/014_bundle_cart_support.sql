-- 014_bundle_cart_support.sql
-- Allow cart_items to represent bundle offers in addition to single products.
-- For bundle cart rows product_id is left NULL and bundle_id identifies the
-- purchased offer; the resolved constituent products are stored in
-- bundle_items_snapshot so the cart display never trusts client state.

-- product_id must be optional so a cart line can represent a bundle
ALTER TABLE public.cart_items ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS bundle_id uuid
    REFERENCES public.bundles(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS bundle_items_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_cart_items_bundle_id
  ON public.cart_items(bundle_id);

-- The existing cart_owner CHECK already enforces (user_id XOR guest_email);
-- bundle rows still satisfy it, so no policy change is required. RLS on
-- cart_items already scopes rows to the owning user/guest.
