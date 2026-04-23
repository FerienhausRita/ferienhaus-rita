-- Migration 024: Guest Rating + Admin Notes Reminders + Bankdaten-Rename
--
-- (a) Umbenennung des Feldes bank_details.holder → account_holder, damit
--     es mit den Konsumenten (E-Mail, Gästeportal, PDF) übereinstimmt.
-- (b) Zwei neue Spalten auf guests für Admin-Bewertung.
-- (c) Zwei neue Werte im email_schedule.email_type CHECK-Constraint für die
--     Notiz-Erinnerungen 7 & 3 Tage vor Anreise.

-- (a) Rename bank_details.holder → account_holder (idempotent)
UPDATE site_settings
SET value = (value - 'holder') || jsonb_build_object('account_holder', value->>'holder')
WHERE key = 'bank_details'
  AND value ? 'holder'
  AND NOT (value ? 'account_holder');

-- (b) Admin-Bewertung + Notizen auf Gast-Ebene
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS admin_rating integer CHECK (admin_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- (c) email_schedule.email_type um die Notiz-Reminder erweitern
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
    'admin_notes_3d'
  ));
