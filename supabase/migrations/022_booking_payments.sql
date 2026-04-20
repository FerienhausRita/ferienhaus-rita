-- Migration 022: Formalize booking_payments table + applies_to allocation
-- Allows manual payments of arbitrary amounts, optionally allocated to
-- 'deposit' or 'remainder' bucket (or 'auto' for smart detection).

CREATE TABLE IF NOT EXISTS booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  paid_at date NOT NULL,
  method text NOT NULL DEFAULT 'bank_transfer',
  applies_to text NOT NULL DEFAULT 'deposit' CHECK (applies_to IN ('deposit', 'remainder')),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Add applies_to column if table already existed without it
ALTER TABLE booking_payments
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'deposit';

-- Ensure CHECK constraint exists (drop & add is safe if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_payments_applies_to_check'
  ) THEN
    ALTER TABLE booking_payments
      ADD CONSTRAINT booking_payments_applies_to_check
      CHECK (applies_to IN ('deposit', 'remainder'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id
  ON booking_payments(booking_id);

ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_payments_service_all" ON booking_payments;
CREATE POLICY "booking_payments_service_all" ON booking_payments
  FOR ALL USING (auth.role() = 'service_role');
