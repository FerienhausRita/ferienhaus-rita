-- 042_invoice_documents.sql
-- Eigenständige Rechnungs-Folgedokumente: Stornorechnung & Rechnungskorrektur.
-- AT-konform: die Originalrechnung an der Buchung bleibt unverändert erhalten;
-- Storno/Korrektur sind separate Belege mit EIGENER lückenloser Nummer und
-- Pflicht-Verweis auf die Originalrechnung. Idempotent.

CREATE TABLE IF NOT EXISTS invoice_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('storno', 'correction')),
  number text NOT NULL UNIQUE,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  snapshot jsonb NOT NULL,
  related_invoice_number text NOT NULL,
  related_invoice_date date,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_documents_booking ON invoice_documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoice_documents_type ON invoice_documents (type);
