-- Migration 028: Warteliste
--
-- Schlanke Tabelle: Gast hinterlegt nur Name, Telefon, Mail + gewünschten
-- Zeitraum (+ optional Wohnung). Wenn die Wohnung in dem Zeitraum frei wird,
-- bekommt der Gast eine Notify-Mail mit personalisierten Buchungslink.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id text,            -- nullable: "egal" zulässig
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  preferred_check_in date NOT NULL,
  preferred_check_out date NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'notified', 'booked', 'expired', 'cancelled')),
  notification_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  CONSTRAINT valid_waitlist_dates CHECK (preferred_check_out > preferred_check_in)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist (status);
CREATE INDEX IF NOT EXISTS idx_waitlist_dates ON public.waitlist (preferred_check_in, preferred_check_out);
CREATE INDEX IF NOT EXISTS idx_waitlist_apartment ON public.waitlist (apartment_id);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Service-Role darf alles
CREATE POLICY "Service role full access on waitlist"
  ON public.waitlist FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin (eingeloggt mit admin_profiles-Eintrag) darf lesen + verwalten
CREATE POLICY "Admins can manage waitlist"
  ON public.waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
    )
  );
