-- Weather cache table for OpenWeatherMap data
-- Single-row cache with 30-minute TTL

CREATE TABLE IF NOT EXISTS weather_cache (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial empty row
INSERT INTO weather_cache (id, data, fetched_at)
VALUES (1, '{}', now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage weather_cache"
  ON weather_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
