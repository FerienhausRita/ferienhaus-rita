-- Migration 029: Einheitlicher Zusatzgast-Tarif
--
-- Die Unterscheidung Erwachsene vs. Kinder bis 12 entfällt — alle Gäste ab 3 J.
-- zahlen jetzt den gleichen Tarif. Kleinkinder unter 3 (gespeichert weiterhin
-- in `bookings.children`) sind kostenfrei und tauchen in der Berechnung nicht
-- mehr auf.
--
-- Wir gleichen `extra_child_price` auf `extra_adult_price` an, damit auch
-- Code-Pfade die das Feld noch lesen, denselben Wert bekommen — defensiv.

UPDATE apartment_pricing
SET extra_child_price = extra_adult_price
WHERE extra_child_price IS DISTINCT FROM extra_adult_price;
