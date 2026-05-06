-- Ferienhaus Rita – Reinigungs-Portal
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- 1) cleaning_profiles: separate Rolle für Reinigungs-User
-- 2) booking-Felder: cleaning_note + arrival_time + departure_time
-- 3) site_settings: default_arrival_time / default_departure_time
-- 4) View cleaning_bookings: anonymisierte Sicht (KEINE Namen/Kontakt/Preis)

-- ============================================
-- 1) CLEANING PROFILES
-- ============================================
create table if not exists public.cleaning_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  invited_by uuid references auth.users(id)
);

alter table public.cleaning_profiles enable row level security;

-- Service-Role Vollzugriff
drop policy if exists "Service role full access on cleaning_profiles" on public.cleaning_profiles;
create policy "Service role full access on cleaning_profiles"
  on public.cleaning_profiles for all
  using (auth.role() = 'service_role');

-- Reinigungs-User darf nur eigenes Profil lesen
drop policy if exists "Cleaning users read own profile" on public.cleaning_profiles;
create policy "Cleaning users read own profile"
  on public.cleaning_profiles for select
  using (auth.uid() = id);

-- Admins dürfen Cleaning-Profile lesen (für SettingsPanel-Liste)
drop policy if exists "Admins read cleaning_profiles" on public.cleaning_profiles;
create policy "Admins read cleaning_profiles"
  on public.cleaning_profiles for select
  using (
    auth.uid() is not null and exists (
      select 1 from public.admin_profiles where id = auth.uid()
    )
  );

-- ============================================
-- 2) BOOKING FELDER
-- ============================================
alter table public.bookings
  add column if not exists cleaning_note text,
  add column if not exists arrival_time time,
  add column if not exists departure_time time;

-- ============================================
-- 3) DEFAULT-ZEITEN IN SITE SETTINGS
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

-- View-Zugriff für authenticated (Cleaning-User + Admins)
grant select on public.cleaning_bookings to authenticated;
