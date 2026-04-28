-- Migration 031: Sonstiges-Feld + zweite Telefonnummer
--
-- (a) Pro Buchung: freie Notizen zum Gast (Beruf, Allergien, Stammgast-Hinweise…)
-- (b) Pro Buchung: zweite Telefonnummer (für Backend/Admin only — nicht in
--     Mails oder Gästeportal sichtbar)
-- (c) Auf der zentralen Gäste-Tabelle ein analoges Sonstiges-Feld, das
--     übergreifend für alle Buchungen dieses Gasts gilt
--
-- Alle Felder sind nullable und werden nur im Admin-UI editiert.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_misc text,
  ADD COLUMN IF NOT EXISTS phone2 text;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS misc text;
