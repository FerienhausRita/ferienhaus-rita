-- Ferienhaus Rita – Anzahlung-Tracking (Deposit Tracking)
-- Phase C: Two-stage payment flow (30% deposit + remainder)

-- ============================================
-- 1. New columns on bookings
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_due_date date,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS remainder_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remainder_due_date date,
  ADD COLUMN IF NOT EXISTS remainder_paid_at timestamptz;

-- ============================================
-- 2. Extend payment_status check constraint
--    Add 'deposit_paid' for when deposit is paid but remainder is outstanding
-- ============================================
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('unpaid', 'deposit_paid', 'paid', 'refunded'));

-- Migrate any 'partial' rows to 'deposit_paid'
UPDATE public.bookings SET payment_status = 'deposit_paid' WHERE payment_status = 'partial';

-- ============================================
-- 3. Extend email_schedule email_type check
--    Add 'deposit_reminder' and 'remainder_reminder'
-- ============================================
ALTER TABLE public.email_schedule DROP CONSTRAINT IF EXISTS email_schedule_email_type_check;
ALTER TABLE public.email_schedule
  ADD CONSTRAINT email_schedule_email_type_check
  CHECK (email_type IN (
    'confirmation', 'payment_reminder', 'checkin_info', 'thankyou',
    'deposit_reminder', 'remainder_reminder'
  ));

-- ============================================
-- 4. Deposit configuration in site_settings
-- ============================================
INSERT INTO public.site_settings (key, value)
VALUES (
  'deposit_config',
  '{"deposit_percent": 30, "deposit_due_days": 7, "remainder_days_before_checkin": 14}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
