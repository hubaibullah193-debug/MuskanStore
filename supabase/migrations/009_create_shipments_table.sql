-- Create shipments table for order fulfillment tracking
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', delivered', 'returned', 'lost')),
  carrier TEXT NOT NULL DEFAULT 'standard',
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery DATE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  weight_kg DECIMAL(10, 2),
  dimensions_cm TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on order_id for fast lookups
CREATE INDEX shipments_order_id_idx ON shipments(order_id);

-- Create index on status for filtering
CREATE INDEX shipments_status_idx ON shipments(status);

-- Create index on created_at for sorting
CREATE INDEX shipments_created_at_idx ON shipments(created_at DESC);

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view shipments for their orders or orders they placed as guests
CREATE POLICY shipments_user_view ON shipments
  FOR SELECT USING (
    -- User owns the order
    order_id IN (
      SELECT id FROM orders
      WHERE user_id = auth.uid() AND user_id IS NOT NULL
    )
  );

-- RLS policy: guests can view shipments via order token
CREATE POLICY shipments_guest_view ON shipments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE guest_token = current_setting('request.headers')::json->>'x-guest-token'
      AND user_id IS NULL
    )
  );

-- RLS policy: service role (admin) can do everything
CREATE POLICY shipments_admin_all ON shipments
  USING (auth.jwt()->>'role' = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
