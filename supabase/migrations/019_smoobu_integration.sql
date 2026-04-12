-- Smoobu Integration: Add tracking columns and sync log

-- Smoobu reservation ID on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS smoobu_reservation_id bigint;

-- Booking source (website, external channel, admin manual)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';

-- Source channel name (e.g. "Booking.com", "Airbnb")
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source_channel text DEFAULT NULL;

-- Sync status with Smoobu
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS smoobu_sync_status text DEFAULT NULL;

-- Index for fast lookup by Smoobu reservation ID
CREATE INDEX IF NOT EXISTS idx_bookings_smoobu_id
  ON public.bookings (smoobu_reservation_id)
  WHERE smoobu_reservation_id IS NOT NULL;

-- Smoobu guest ID on guests table
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS smoobu_guest_id bigint;

-- Sync log for admin visibility and debugging
CREATE TABLE IF NOT EXISTS public.smoobu_sync_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction text NOT NULL CHECK (direction IN ('push', 'pull')),
  event_type text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  smoobu_reservation_id bigint,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smoobu_sync_log_created
  ON public.smoobu_sync_log (created_at DESC);

-- RLS
ALTER TABLE public.smoobu_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on smoobu_sync_log"
  ON public.smoobu_sync_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed Smoobu config
INSERT INTO public.site_settings (key, value) VALUES
  ('smoobu_config', '{
    "enabled": false,
    "apartment_mapping": {
      "grossglockner-suite": 3240557,
      "gletscherblick": 3242967,
      "almrausch": 3242977,
      "edelweiss": 3242982
    },
    "pricing_source": "local",
    "last_sync_at": null
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
