-- Remove public read access to bookings (all queries go through API with service_role)
DROP POLICY IF EXISTS "Anon can check booking dates" ON public.bookings;

-- Keep anon read on blocked_dates (only contains apartment_id and dates, no personal data)
-- The existing policy "Anon can read blocked dates" is fine.
