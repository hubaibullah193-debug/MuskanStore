-- 001_create_order_items.sql
-- order_items is the only table missing from 000_unified_mvp_schema.sql.
-- Created idempotently so this set is re-runnable from a clean database.

CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id   UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL,
  unit_price   NUMERIC(10, 2) NOT NULL,
  line_total   NUMERIC(10, 2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
