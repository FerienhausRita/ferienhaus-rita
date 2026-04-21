-- Migration 023: iCal-Import-Feeds (editierbar im Admin-Panel)
--
-- Ersetzt die hart-codierte Liste in src/data/ical-feeds.ts durch eine
-- DB-Tabelle. Pro Feed werden Aktiv-Status, Label (Airbnb / Smoobu / Booking
-- / Extern) und Sync-Metadaten (letzter erfolgreicher Lauf, Fehlernachricht,
-- Event-Count) gespeichert.

CREATE TABLE IF NOT EXISTS ical_import_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id text NOT NULL,
  url text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_status text,            -- 'ok' | 'error'
  last_sync_error text,
  last_sync_event_count integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ical_feeds_apartment ON ical_import_feeds(apartment_id);
CREATE INDEX IF NOT EXISTS idx_ical_feeds_active ON ical_import_feeds(active);

ALTER TABLE ical_import_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ical_import_feeds_service_all" ON ical_import_feeds;
CREATE POLICY "ical_import_feeds_service_all" ON ical_import_feeds
  FOR ALL USING (auth.role() = 'service_role');

-- Seed: bestehende Feeds aus src/data/ical-feeds.ts übernehmen.
-- Kein ON CONFLICT-Ziel vorhanden (keine UNIQUE-Constraint) → wir
-- prüfen per WHERE NOT EXISTS, damit der Seed idempotent ist.
INSERT INTO ical_import_feeds (apartment_id, url, label)
SELECT v.apartment_id, v.url, v.label
FROM (
  VALUES
    ('grossglockner-suite', 'https://login.smoobu.com/ical/3240557.ics?s=YAfqbbm2WH', 'Smoobu'),
    ('grossglockner-suite', 'https://www.airbnb.de/calendar/ical/1662358419016161878.ics?t=c25400ade2ab4db39e32dbfcd42215e9', 'Airbnb'),
    ('gletscherblick', 'https://login.smoobu.com/ical/3242967.ics?s=o6FNs8kBpB', 'Smoobu'),
    ('gletscherblick', 'https://www.airbnb.de/calendar/ical/1658111635029895521.ics?t=2d6c4d44115d432db0d37eaf70b48d9d', 'Airbnb'),
    ('almrausch', 'https://login.smoobu.com/ical/3242977.ics?s=vMDExsmPyD', 'Smoobu'),
    ('edelweiss', 'https://login.smoobu.com/ical/3242982.ics?s=DgcCSL%2FWMR', 'Smoobu')
) AS v(apartment_id, url, label)
WHERE NOT EXISTS (
  SELECT 1 FROM ical_import_feeds f
  WHERE f.apartment_id = v.apartment_id AND f.url = v.url
);
