-- Migration 030: Kleinkinder unter 3 Jahre als eigene Spalte
--
-- Personen-Kategorien neu:
--   adults   = Gäste ab 3 Jahre (= Auslastungsbasis, zahlt vollen Tarif)
--   children = davon Kinder zwischen 3 und 17 Jahren (Untermenge, info-only)
--   infants  = Kleinkinder unter 3 Jahre (kostenfrei, zählen nicht zur Auslastung) — NEU
--
-- Bestandsdaten bleiben unverändert: children behält für Altbuchungen
-- weiterhin die ursprüngliche Bedeutung „Kinder bis 12" — Admin kann
-- nachträglich neu kategorisieren falls gewünscht.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_infants_nonneg;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_infants_nonneg CHECK (infants >= 0);
