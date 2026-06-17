-- Ferienhaus Rita – Reinigungs-Portal: Login per Benutzername + Passwort
-- Idempotent. Supersedet 033 (enthält dieselbe Struktur + username).
--
-- Reinigungs-User melden sich künftig mit Benutzername + Passwort an.
-- Supabase Auth benötigt intern eine E-Mail → wir leiten aus dem
-- Benutzernamen eine synthetische, NIE versendete Adresse ab:
--   <username>@cleaning.ferienhaus-rita.at
-- Diese Adresse wird in cleaning_profiles.email gespeichert.

-- ============================================
-- 1) CLEANING PROFILES (idempotent, inkl. username)
-- ============================================
create table if not exists public.cleaning_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  invited_by uuid references auth.users(id)
);

-- username-Spalte ergänzen (falls Tabelle aus 033 bereits existierte)
alter table public.cleaning_profiles
  add column if not exists username text;

-- Bestehende Zeilen: username aus E-Mail-Localpart ableiten
update public.cleaning_profiles
  set username = split_part(email, '@', 1)
  where username is null or username = '';

-- Eindeutigkeit des Benutzernamens (case-insensitiv)
create unique index if not exists cleaning_profiles_username_key
  on public.cleaning_profiles (lower(username));

alter table public.cleaning_profiles enable row level security;

drop policy if exists "Service role full access on cleaning_profiles" on public.cleaning_profiles;
create policy "Service role full access on cleaning_profiles"
  on public.cleaning_profiles for all
  using (auth.role() = 'service_role');

drop policy if exists "Cleaning users read own profile" on public.cleaning_profiles;
create policy "Cleaning users read own profile"
  on public.cleaning_profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins read cleaning_profiles" on public.cleaning_profiles;
create policy "Admins read cleaning_profiles"
  on public.cleaning_profiles for select
  using (
    auth.uid() is not null and exists (
      select 1 from public.admin_profiles where id = auth.uid()
    )
  );

-- ============================================
-- 2) BOOKING FELDER (idempotent)
-- ============================================
alter table public.bookings
  add column if not exists cleaning_note text,
  add column if not exists arrival_time time,
  add column if not exists departure_time time;

-- ============================================
-- 3) DEFAULT-ZEITEN IN SITE SETTINGS (idempotent)
-- ============================================
insert into public.site_settings (key, value)
values
  ('default_arrival_time',   '"16:00"'::jsonb),
  ('default_departure_time', '"10:00"'::jsonb)
on conflict (key) do nothing;

-- ============================================
-- 4) ANONYMISIERTE VIEW (kein Name, kein Kontakt, kein Preis)
-- ============================================
create or replace view public.cleaning_bookings as
select
  b.id,
  b.apartment_id,
  b.check_in,
  b.check_out,
  b.adults,
  b.children,
  b.infants,
  b.dogs,
  b.cleaning_note,
  coalesce(
    b.arrival_time,
    (select (value #>> '{}')::time from public.site_settings where key = 'default_arrival_time')
  ) as arrival_time,
  coalesce(
    b.departure_time,
    (select (value #>> '{}')::time from public.site_settings where key = 'default_departure_time')
  ) as departure_time,
  b.status
from public.bookings b
where b.status in ('confirmed', 'pending')
  and b.check_out >= current_date;

grant select on public.cleaning_bookings to authenticated;
