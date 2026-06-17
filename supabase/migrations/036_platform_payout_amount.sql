-- Ferienhaus Rita – Netto-Auszahlungsbetrag externer Plattformen
-- total_price = Buchungswert (brutto, was der Gast zahlt).
-- payout_amount = tatsächlich von der Plattform ausgezahlter Netto-Betrag
-- (nach Abzug der Plattform-Gebühr). Differenz = Gebühr.
-- Idempotent.

alter table public.bookings
  add column if not exists payout_amount numeric;
