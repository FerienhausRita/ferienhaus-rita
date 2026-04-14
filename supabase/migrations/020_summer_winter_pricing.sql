-- Migration 020: Summer/Winter pricing model
-- Replaces the multiplier-based season system with direct summer/winter prices per apartment
-- and special period surcharges (Christmas, Carnival, etc.)

-- ─── 1. Extend apartment_pricing with summer/winter prices ───

ALTER TABLE apartment_pricing
  ADD COLUMN IF NOT EXISTS summer_price numeric,
  ADD COLUMN IF NOT EXISTS winter_price numeric,
  ADD COLUMN IF NOT EXISTS min_nights_summer integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS min_nights_winter integer DEFAULT 5;

-- Initialize from existing base_price
UPDATE apartment_pricing
SET summer_price = base_price,
    winter_price = base_price
WHERE summer_price IS NULL;

-- ─── 2. Create special_periods table ───

CREATE TABLE IF NOT EXISTS special_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_mmdd text NOT NULL,
  end_mmdd text NOT NULL,
  surcharge_percent numeric NOT NULL DEFAULT 0,
  min_nights integer DEFAULT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE special_periods ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for booking page)
CREATE POLICY "special_periods_public_read" ON special_periods
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "special_periods_service_all" ON special_periods
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 3. Seed default special periods ───

INSERT INTO special_periods (label, start_mmdd, end_mmdd, surcharge_percent, min_nights) VALUES
  ('Weihnachten/Neujahr', '12-20', '01-06', 20, 7),
  ('Fasching/Semesterferien', '02-01', '03-07', 10, 5),
  ('Ostern', '03-20', '04-15', 10, 5),
  ('Sommerferien', '07-01', '08-31', 15, 5)
ON CONFLICT DO NOTHING;
