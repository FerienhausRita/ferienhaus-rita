-- Migration 026: Kinder-Zusatzpreis + Hunde-Staffelung
--
-- (a) Aufteilung des Zusatzgast-Preises: Erwachsene vs. Kinder bis 12 J.
--     - extra_adult_price (default: bisheriger extra_person_price)
--     - extra_child_price (default 20 €)
-- (b) Hunde-Staffelung: 1. Hund volle Gebühr, ab 2. Hund halbe Gebühr
--     - first_dog_fee (default: bisheriger dog_fee)
--     - additional_dog_fee (default 7,50 €)
--
-- Die alten Spalten (extra_person_price, dog_fee) bleiben für Rückwärts-
-- kompatibilität bestehen, werden aber von der Pricing-Engine nicht mehr
-- aktiv konsultiert sobald die neuen Felder gesetzt sind.

ALTER TABLE apartment_pricing
  ADD COLUMN IF NOT EXISTS extra_adult_price numeric,
  ADD COLUMN IF NOT EXISTS extra_child_price numeric,
  ADD COLUMN IF NOT EXISTS first_dog_fee numeric,
  ADD COLUMN IF NOT EXISTS additional_dog_fee numeric;

-- Bestehende Datensätze: Default-Werte aus den alten Feldern übernehmen,
-- damit kein Apartment plötzlich 0 € Zusatzpreis hat.
UPDATE apartment_pricing
SET extra_adult_price = COALESCE(extra_adult_price, extra_person_price, 30),
    extra_child_price = COALESCE(extra_child_price, 20),
    first_dog_fee     = COALESCE(first_dog_fee, dog_fee, 15),
    additional_dog_fee = COALESCE(additional_dog_fee, 7.50);

-- Ab jetzt sollen neue Datensätze die neuen Felder konsequent füllen.
ALTER TABLE apartment_pricing
  ALTER COLUMN extra_adult_price SET NOT NULL,
  ALTER COLUMN extra_child_price SET NOT NULL,
  ALTER COLUMN first_dog_fee SET NOT NULL,
  ALTER COLUMN additional_dog_fee SET NOT NULL;

ALTER TABLE apartment_pricing
  ALTER COLUMN extra_adult_price SET DEFAULT 30,
  ALTER COLUMN extra_child_price SET DEFAULT 20,
  ALTER COLUMN first_dog_fee SET DEFAULT 15,
  ALTER COLUMN additional_dog_fee SET DEFAULT 7.50;
