-- Migration 032: Rechnungs-Snapshot für stabile Rechnungen
--
-- Bisher wurde die Rechnung beim Download jedes Mal neu aus apartment-Config
-- + DB berechnet — Folge: spätere Änderungen an apartment.basePrice oder
-- booking.adults wirkten rückwirkend auf alte Rechnungen.
--
-- Snapshot-Modell: beim Klick auf „Rechnung erstellen" wird ein vollständiges
-- JSON eingefroren, das alle Positionen, Steuern, Bank- und Adressdaten
-- enthält. PDF rendert ab dann nur noch aus diesem Snapshot.
--
-- Storno: alte invoice_number wird ins previous_invoice_number-Feld
-- archiviert, Snapshot/Number/Finalized werden geleert. Beim nächsten
-- „Rechnung erstellen" wird eine neue Nummer vergeben.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invoice_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS invoice_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_invoice_number text;

-- Hilfreich für „Rechnungen ausgestellt"-Filter im Admin
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_finalized
  ON bookings (invoice_finalized_at)
  WHERE invoice_finalized_at IS NOT NULL;
