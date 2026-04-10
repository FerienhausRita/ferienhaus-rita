-- Consent tracking: store when guest accepted terms and from which IP
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text,
  ADD COLUMN IF NOT EXISTS terms_version text DEFAULT '2026-04',
  ADD COLUMN IF NOT EXISTS terms_sent_at timestamptz;
