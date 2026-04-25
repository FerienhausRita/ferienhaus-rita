-- Migration 027: Neuer Email-Type "admin_payment_check_7d"
--
-- Eine interne Mail an die Admin-Adresse 7 Tage nach Buchungsbestätigung,
-- damit geprüft werden kann, ob die Anzahlung schon eingegangen ist.
-- Sendet nur, wenn payment_status zum Cron-Run-Zeitpunkt noch "unpaid" ist.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.email_schedule'::regclass
    AND pg_get_constraintdef(oid) ILIKE '%email_type%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.email_schedule DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE email_schedule
  ADD CONSTRAINT email_schedule_email_type_check
  CHECK (email_type IN (
    'confirmation',
    'payment_reminder',
    'checkin_info',
    'thankyou',
    'deposit_reminder',
    'remainder_reminder',
    'admin_notes_7d',
    'admin_notes_3d',
    'admin_payment_check_7d'
  ));
