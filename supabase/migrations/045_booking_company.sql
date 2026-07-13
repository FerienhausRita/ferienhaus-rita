-- 045_booking_company.sql
-- Optionale Firmen-Rechnungsdaten je Buchung: Firmenname + UID/USt-IdNr.
-- Beides nullable → bestehende Buchungen unberührt. Idempotent.

alter table public.bookings
  add column if not exists company text,
  add column if not exists vat_id text;
