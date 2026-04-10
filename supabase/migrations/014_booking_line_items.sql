-- Additional line items for bookings (e.g. extra services, adjustments)
CREATE TABLE IF NOT EXISTS booking_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by booking
CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id ON booking_line_items(booking_id);

-- RLS
ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by admin actions)
CREATE POLICY "Service role can manage line items"
  ON booking_line_items FOR ALL
  USING (true)
  WITH CHECK (true);
