-- Migration 025: Kurtaxe aus Gesamtpreis entkoppeln
--
-- Ab jetzt wird die Kurtaxe nicht mehr in den Buchungs-Gesamtpreis
-- eingerechnet. Sie wird direkt vor Ort separat abgerechnet. Der Satz selbst
-- bleibt in tax_config als Anzeigewert, damit Hinweistexte auf Website,
-- Gästeportal, Bestätigungsmail und Rechnung die aktuelle Höhe (z.B. 2,60 €
-- pro Person ab 15 Jahren pro Nacht) dynamisch anzeigen können.

-- Neue Spalte für jeden tax_config-Eintrag: ist er im Gesamtpreis enthalten?
ALTER TABLE tax_config
  ADD COLUMN IF NOT EXISTS included boolean NOT NULL DEFAULT true;

-- Die Kurtaxe wird ab sofort NICHT mehr im Gesamtpreis geführt.
UPDATE tax_config SET included = false WHERE key = 'local_tax';

-- MwSt. bleibt included = true (Default) — ist ja Bestandteil des Brutto-Preises.
