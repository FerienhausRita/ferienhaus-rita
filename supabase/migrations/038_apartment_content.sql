-- Ferienhaus Rita – Bearbeitbare Wohnungsinhalte
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Tabelle apartment_content: pro Wohnung überschreibbare Detailseiten-Inhalte.
-- Alle Spalten nullable → null bedeutet "statischen Standard aus apartments.ts verwenden".
-- apartment_id ist der slug (z.B. "gletscherblick"), passend zu apartment_pricing/apartment_images.
-- Der Name bleibt in apartment_pricing.name_override (keine Duplizierung).

create table if not exists public.apartment_content (
  apartment_id text primary key,
  subtitle text,
  description text,
  short_description text,
  floor text,
  size int,
  bedrooms int,
  bathrooms int,
  max_guests int,
  base_guests int,
  features jsonb,
  highlights jsonb,
  amenities jsonb,
  available boolean,
  updated_at timestamptz not null default now()
);

alter table public.apartment_content enable row level security;

-- Service-Role Vollzugriff (Admin-Editor läuft über den Service-Role-Client)
drop policy if exists "Service role full access on apartment_content" on public.apartment_content;
create policy "Service role full access on apartment_content"
  on public.apartment_content for all
  using (auth.role() = 'service_role');

-- Öffentliches Lesen (Inhalte erscheinen auf der Website)
drop policy if exists "Public read apartment_content" on public.apartment_content;
create policy "Public read apartment_content"
  on public.apartment_content for select
  using (true);

-- Admins dürfen verwalten (Fallback, falls direkt über den Auth-Client genutzt)
drop policy if exists "Admins manage apartment_content" on public.apartment_content;
create policy "Admins manage apartment_content"
  on public.apartment_content for all
  using (
    auth.uid() is not null and exists (
      select 1 from public.admin_profiles where id = auth.uid()
    )
  );
