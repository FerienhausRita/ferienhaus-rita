-- 041_receipt_automation.sql
-- Beleg-Automatisierung: OCR-Entwürfe, Duplikat-Erkennung, Herkunft.
-- Idempotent — mehrfaches Ausführen ist gefahrlos.

-- Status: neu erkannte Belege sind 'draft' (müssen geprüft/bestätigt werden),
-- bestehende & manuelle Ausgaben gelten als 'confirmed'.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

-- SHA-256 des Original-Files für Duplikat-Erkennung (Upload & OneDrive).
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS file_hash text;

-- Vom OCR erkannter Lieferant/Händler.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor text;

-- Rohausgabe des OCR (zur Nachvollziehbarkeit / späteren Korrektur).
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ocr_data jsonb;

-- Herkunft: 'manual' | 'upload' | 'onedrive'.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Bestehende Datensätze sicher auf 'confirmed' setzen (falls Spalte schon ohne Default existierte).
UPDATE expenses SET status = 'confirmed' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_file_hash ON expenses (file_hash);
