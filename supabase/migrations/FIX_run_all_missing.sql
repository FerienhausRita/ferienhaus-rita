-- ============================================================
-- FERIENHAUS RITA – Alle fehlenden Migrationen (002-007)
-- Einmal im Supabase SQL Editor ausführen!
-- ============================================================

-- ============================================
-- 002: Seasonal Pricing Columns on Bookings
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS local_tax_total numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- ============================================
-- 003: Remove public read on bookings
-- ============================================
DROP POLICY IF EXISTS "Anon can check booking dates" ON public.bookings;

-- ============================================
-- 004: Admin Dashboard Schema
-- ============================================

-- Admin Profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update trigger (only if table was just created)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'admin_profiles_updated_at'
  ) THEN
    CREATE TRIGGER admin_profiles_updated_at
      BEFORE UPDATE ON public.admin_profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on admin_profiles') THEN
    CREATE POLICY "Service role full access on admin_profiles"
      ON public.admin_profiles FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read own profile') THEN
    CREATE POLICY "Admins can read own profile"
      ON public.admin_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Payment status on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'bookings' AND constraint_name = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'));
  END IF;
END $$;

-- RLS for admin access to bookings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can read bookings') THEN
    CREATE POLICY "Authenticated admins can read bookings"
      ON public.bookings FOR SELECT
      USING (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can update bookings') THEN
    CREATE POLICY "Authenticated admins can update bookings"
      ON public.bookings FOR UPDATE
      USING (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- RLS for blocked_dates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can insert blocked_dates') THEN
    CREATE POLICY "Authenticated admins can insert blocked_dates"
      ON public.blocked_dates FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can delete blocked_dates') THEN
    CREATE POLICY "Authenticated admins can delete blocked_dates"
      ON public.blocked_dates FOR DELETE
      USING (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- RLS for contact_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can read contact_messages') THEN
    CREATE POLICY "Authenticated admins can read contact_messages"
      ON public.contact_messages FOR SELECT
      USING (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated admins can update contact_messages') THEN
    CREATE POLICY "Authenticated admins can update contact_messages"
      ON public.contact_messages FOR UPDATE
      USING (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
      ));
  END IF;
END $$;

-- ============================================
-- 005: Notes, Tasks & Email Log
-- ============================================

-- Booking Notes
CREATE TABLE IF NOT EXISTS public.booking_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  author_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_notes_booking ON public.booking_notes (booking_id);

ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on booking_notes') THEN
    CREATE POLICY "Service role full access on booking_notes"
      ON public.booking_notes FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage booking_notes') THEN
    CREATE POLICY "Admins can manage booking_notes"
      ON public.booking_notes FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Guest Emails
CREATE TABLE IF NOT EXISTS public.guest_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  sent_by_name text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_emails_booking ON public.guest_emails (booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_emails_guest ON public.guest_emails (guest_email);

ALTER TABLE public.guest_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on guest_emails') THEN
    CREATE POLICY "Service role full access on guest_emails"
      ON public.guest_emails FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage guest_emails') THEN
    CREATE POLICY "Admins can manage guest_emails"
      ON public.guest_emails FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  apartment_id text,
  title text NOT NULL,
  description text,
  due_date date,
  category text NOT NULL DEFAULT 'allgemein'
    CHECK (category IN ('anreise', 'abreise', 'reinigung', 'wartung', 'allgemein')),
  status text NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'erledigt')),
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_booking ON public.tasks (booking_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at'
  ) THEN
    CREATE TRIGGER tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on tasks') THEN
    CREATE POLICY "Service role full access on tasks"
      ON public.tasks FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage tasks') THEN
    CREATE POLICY "Admins can manage tasks"
      ON public.tasks FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- ============================================
-- 006: Discount Codes
-- ============================================

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  value numeric NOT NULL,
  label text NOT NULL,
  min_subtotal numeric DEFAULT 0,
  max_uses integer DEFAULT 0,
  current_uses integer DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes (code);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'discount_codes_updated_at'
  ) THEN
    CREATE TRIGGER discount_codes_updated_at
      BEFORE UPDATE ON public.discount_codes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on discount_codes') THEN
    CREATE POLICY "Service role full access on discount_codes"
      ON public.discount_codes FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage discount_codes') THEN
    CREATE POLICY "Admins can manage discount_codes"
      ON public.discount_codes FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active discount_codes') THEN
    CREATE POLICY "Public can read active discount_codes"
      ON public.discount_codes FOR SELECT USING (active = true);
  END IF;
END $$;

-- Seed discount codes (skip if already exist)
INSERT INTO public.discount_codes (code, type, value, label, min_subtotal, max_uses) VALUES
  ('WILLKOMMEN10', 'percent', 10, '10% Willkommensrabatt', 0, 0),
  ('FRUEHBUCHER', 'percent', 5, '5% Frühbucherrabatt', 500, 0)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 007: Dynamic Pricing & Guests
-- ============================================

-- Apartment Pricing
CREATE TABLE IF NOT EXISTS public.apartment_pricing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id text NOT NULL UNIQUE,
  base_price numeric NOT NULL,
  extra_person_price numeric NOT NULL,
  cleaning_fee numeric NOT NULL,
  dog_fee numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'apartment_pricing_updated_at'
  ) THEN
    CREATE TRIGGER apartment_pricing_updated_at
      BEFORE UPDATE ON public.apartment_pricing
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.apartment_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read apartment_pricing') THEN
    CREATE POLICY "Public can read apartment_pricing"
      ON public.apartment_pricing FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on apartment_pricing') THEN
    CREATE POLICY "Service role full access on apartment_pricing"
      ON public.apartment_pricing FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage apartment_pricing') THEN
    CREATE POLICY "Admins can manage apartment_pricing"
      ON public.apartment_pricing FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

INSERT INTO public.apartment_pricing (apartment_id, base_price, extra_person_price, cleaning_fee, dog_fee) VALUES
  ('grossglockner-suite', 170, 20, 100, 15),
  ('gletscherblick', 170, 20, 100, 15),
  ('almrausch', 90, 20, 50, 15),
  ('edelweiss', 90, 20, 50, 15)
ON CONFLICT (apartment_id) DO NOTHING;

-- Season Configs
CREATE TABLE IF NOT EXISTS public.season_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL UNIQUE CHECK (type IN ('high', 'mid', 'low')),
  label text NOT NULL,
  multiplier numeric NOT NULL,
  min_nights integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'season_configs_updated_at'
  ) THEN
    CREATE TRIGGER season_configs_updated_at
      BEFORE UPDATE ON public.season_configs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.season_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read season_configs') THEN
    CREATE POLICY "Public can read season_configs"
      ON public.season_configs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on season_configs') THEN
    CREATE POLICY "Service role full access on season_configs"
      ON public.season_configs FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage season_configs') THEN
    CREATE POLICY "Admins can manage season_configs"
      ON public.season_configs FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

INSERT INTO public.season_configs (type, label, multiplier, min_nights) VALUES
  ('high', 'Hochsaison', 1.3, 5),
  ('mid', 'Zwischensaison', 1.0, 3),
  ('low', 'Nebensaison', 0.85, 2)
ON CONFLICT (type) DO NOTHING;

-- Season Periods
CREATE TABLE IF NOT EXISTS public.season_periods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('high', 'mid', 'low')),
  start_mmdd text NOT NULL,
  end_mmdd text NOT NULL,
  label text NOT NULL
);

ALTER TABLE public.season_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read season_periods') THEN
    CREATE POLICY "Public can read season_periods"
      ON public.season_periods FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on season_periods') THEN
    CREATE POLICY "Service role full access on season_periods"
      ON public.season_periods FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage season_periods') THEN
    CREATE POLICY "Admins can manage season_periods"
      ON public.season_periods FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Only seed if empty
INSERT INTO public.season_periods (type, start_mmdd, end_mmdd, label)
SELECT * FROM (VALUES
  ('high', '12-20', '01-06', 'Winterhochsaison'),
  ('high', '02-01', '03-07', 'Winterhochsaison'),
  ('high', '07-01', '08-31', 'Sommerhochsaison'),
  ('mid', '01-07', '01-31', 'Zwischensaison'),
  ('mid', '03-08', '04-20', 'Zwischensaison'),
  ('mid', '06-01', '06-30', 'Zwischensaison'),
  ('mid', '09-01', '10-15', 'Zwischensaison')
) AS v(type, start_mmdd, end_mmdd, label)
WHERE NOT EXISTS (SELECT 1 FROM public.season_periods LIMIT 1);

-- Tax Config
CREATE TABLE IF NOT EXISTS public.tax_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  rate numeric NOT NULL,
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tax_config_updated_at'
  ) THEN
    CREATE TRIGGER tax_config_updated_at
      BEFORE UPDATE ON public.tax_config
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read tax_config') THEN
    CREATE POLICY "Public can read tax_config"
      ON public.tax_config FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on tax_config') THEN
    CREATE POLICY "Service role full access on tax_config"
      ON public.tax_config FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage tax_config') THEN
    CREATE POLICY "Admins can manage tax_config"
      ON public.tax_config FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

INSERT INTO public.tax_config (key, rate, label, description) VALUES
  ('local_tax', 2.50, 'Ortstaxe', 'Pro Person pro Nacht, Kinder unter 15 befreit'),
  ('vat', 0.10, 'MwSt', 'Ermäßigter Satz 10% für Beherbergung')
ON CONFLICT (key) DO NOTHING;

-- Guests Table
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  street text,
  zip text,
  city text,
  country text DEFAULT 'AT',
  notes text,
  total_stays integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  first_visit date,
  last_visit date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'guests_updated_at'
  ) THEN
    CREATE TRIGGER guests_updated_at
      BEFORE UPDATE ON public.guests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on guests') THEN
    CREATE POLICY "Service role full access on guests"
      ON public.guests FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage guests') THEN
    CREATE POLICY "Admins can manage guests"
      ON public.guests FOR ALL USING (
        auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Guest FK on bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.guests(id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON public.bookings (guest_id);

-- Backfill: Create guest records from existing bookings
INSERT INTO public.guests (email, first_name, last_name, phone, street, zip, city, country, total_stays, total_revenue, first_visit, last_visit)
SELECT
  b.email,
  (array_agg(b.first_name ORDER BY b.created_at DESC))[1],
  (array_agg(b.last_name ORDER BY b.created_at DESC))[1],
  (array_agg(b.phone ORDER BY b.created_at DESC))[1],
  (array_agg(b.street ORDER BY b.created_at DESC))[1],
  (array_agg(b.zip ORDER BY b.created_at DESC))[1],
  (array_agg(b.city ORDER BY b.created_at DESC))[1],
  (array_agg(b.country ORDER BY b.created_at DESC))[1],
  count(*)::integer,
  coalesce(sum(b.total_price), 0),
  min(b.check_in),
  max(b.check_in)
FROM public.bookings b
WHERE b.status != 'cancelled'
GROUP BY b.email
ON CONFLICT (email) DO NOTHING;

-- Backfill: Set guest_id on existing bookings
UPDATE public.bookings b
SET guest_id = g.id
FROM public.guests g
WHERE b.email = g.email AND b.guest_id IS NULL;

-- ============================================
-- DONE! Schema cache reload
-- ============================================
NOTIFY pgrst, 'reload schema';
