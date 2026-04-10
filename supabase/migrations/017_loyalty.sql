-- Loyalty / Stammgast extensions

-- Extend discount_codes with loyalty fields
ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS is_loyalty BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_booking_id UUID REFERENCES bookings(id);

-- Extend bookings with returning guest tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_returning_guest BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_booking_id UUID REFERENCES bookings(id);

-- Index for quick loyalty code lookup by email
CREATE INDEX IF NOT EXISTS idx_discount_codes_guest_email ON discount_codes (guest_email) WHERE is_loyalty = true;
