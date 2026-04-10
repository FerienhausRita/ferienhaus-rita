-- Points of Interest for interactive map

CREATE TYPE poi_category AS ENUM (
  'restaurant',
  'hiking',
  'activity',
  'viewpoint',
  'shopping',
  'emergency',
  'ski',
  'accommodation'
);

CREATE TABLE IF NOT EXISTS points_of_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category poi_category NOT NULL DEFAULT 'activity',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  website TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active POIs"
  ON points_of_interest
  FOR SELECT
  USING (active = true);

CREATE POLICY "Service role can manage POIs"
  ON points_of_interest
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed data from existing restaurants
INSERT INTO points_of_interest (name, description, category, lat, lng, website, is_featured) VALUES
  ('Adlerlounge', 'Panorama-Restaurant auf 2.621 m mit 360°-Blick', 'restaurant', 47.0068, 12.6312, 'https://www.adlerlounge.at/', true),
  ('Lucknerhaus', 'Traditionsreiche Jausenstation im Ködnitztal', 'restaurant', 47.0234, 12.6543, NULL, true),
  ('Glocknerblick', 'Gasthof mit Panoramaterrasse', 'restaurant', 47.0012, 12.6445, NULL, false),
  ('GG Resort Talstation', 'Skigebiet GG Resort Kals-Matrei', 'ski', 47.0045, 12.6380, 'https://www.gg-resort.at/', true),
  ('Großglockner Aussichtspunkt', 'Blick auf den höchsten Berg Österreichs', 'viewpoint', 47.0243, 12.6567, NULL, true),
  ('Dorfertal Wanderweg', 'Wanderung ins Dorfertal zum Dorfer See', 'hiking', 47.0123, 12.6234, NULL, false),
  ('SPAR Kals', 'Lebensmittel & Grundversorgung', 'shopping', 46.9985, 12.6445, NULL, false),
  ('Bergrettung Kals', 'Bergrettung Ortsstelle Kals', 'emergency', 46.9978, 12.6440, NULL, false);
