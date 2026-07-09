-- 043_rls_hardening.sql
-- Behebt die Supabase-Security-Lints (Projekt hqjuslhvsobpninhbpjq), Stand 01.07.2026.
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- HINTERGRUND / Zugriffsmodell (verifiziert per Code-Audit):
--   Die App liest/schreibt ALLE hier betroffenen Tabellen ausschließlich server-seitig
--   über den Service-Role-Key (createServerClient) — dieser umgeht RLS grundsätzlich
--   (Postgres-Rolle service_role hat BYPASSRLS). Der Auth-/Anon-Client
--   (createAuthServerClient) wird nur für auth.getUser() + Rollen-Checks
--   (admin_profiles / cleaning_profiles Self-Read) genutzt, NIE für diese Tabellen.
--   Deshalb ist "RLS an, keine (bzw. nur service_role-)Policy" hier funktional dicht,
--   ohne dass Admin-Login, Reinigungsportal oder Gäste-Chat brechen.
--
-- WICHTIG zur Reihenfolge (Abschnitt 4 = View):
--   Zuerst den Code-Change (getCleaningBookings liest via Service-Role) deployen,
--   DANN diese Migration einspielen. Der Code funktioniert mit beiden View-Varianten,
--   daher entsteht keine Lücke.

-- ============================================================
-- 1) RLS aktivieren auf Tabellen, die bisher GAR KEINE RLS hatten
--    (ERROR: rls_disabled_in_public)
--    -> keine Policy nötig: nur service_role (BYPASSRLS) greift zu.
-- ============================================================

-- Migrations-Tracking (nur Dateinamen, kein PII) — von scripts/migrate.mjs angelegt.
alter table if exists public._migrations enable row level security;

-- Rechnungs-Folgedokumente (Storno/Korrektur) — enthält Snapshot mit Gastdaten/Beträgen.
-- Wird ausschließlich via Service-Role gelesen (api/admin/invoice-document/[id]).
alter table if exists public.invoice_documents enable row level security;

-- ============================================================
-- 2) Zu weite "always true"-Policies entfernen
--    (WARN: rls_policy_always_true — Policy galt für PUBLIC = auch anon)
--    RLS bleibt aktiv; ohne Policy erhalten anon/authenticated KEINEN Zugriff,
--    service_role wirkt weiterhin (BYPASSRLS). Alle 6 Tabellen werden per
--    Code nur über Service-Role angesprochen (auditiert).
-- ============================================================
alter table if exists public.booking_line_items enable row level security;
drop policy if exists "Service role can manage line items"       on public.booking_line_items;

alter table if exists public.chat_conversations enable row level security;
drop policy if exists "Service role manages chat_conversations"  on public.chat_conversations;

alter table if exists public.chat_messages enable row level security;
drop policy if exists "Service role manages chat_messages"       on public.chat_messages;

alter table if exists public.points_of_interest enable row level security;
drop policy if exists "Service role can manage POIs"             on public.points_of_interest;

alter table if exists public.smoobu_sync_log enable row level security;
drop policy if exists "Service role full access on smoobu_sync_log" on public.smoobu_sync_log;

alter table if exists public.weather_cache enable row level security;
drop policy if exists "Service role can manage weather_cache"    on public.weather_cache;

-- ============================================================
-- 3) Funktion mit festem search_path (WARN: function_search_path_mutable)
--    Trigger-Funktion nutzt nur now() (pg_catalog) -> leerer search_path ist sicher.
-- ============================================================
alter function public.update_updated_at() set search_path = '';

-- ============================================================
-- 4) SECURITY-DEFINER-View entschärfen (ERROR: security_definer_view)
--    cleaning_bookings ist eine anonymisierte Sicht (nur Zeiten/Belegung,
--    KEINE Namen/Kontakt/Preise). Umstellung auf security_invoker=on, damit
--    die View nicht mehr die RLS des Erstellers umgeht. Der Reinigungsportal-Code
--    liest die View ab jetzt via Service-Role (BYPASSRLS) — Zugriffskontrolle
--    erfolgt weiterhin app-seitig (cleaning_profiles/admin_profiles-Check).
--
--    VORAUSSETZUNG: Code-Change (getCleaningBookings -> createServerClient) ist live.
-- ============================================================
create or replace view public.cleaning_bookings
  with (security_invoker = on) as
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

-- authenticated braucht die View nicht mehr direkt (Lesen läuft über Service-Role).
-- Least privilege: direkten Zugriff der authenticated-Rolle entziehen.
revoke select on public.cleaning_bookings from authenticated;

-- ============================================================
-- HINWEIS (nicht per SQL lösbar — im Dashboard erledigen):
--   auth_leaked_password_protection = WARN
--   -> Supabase Dashboard: Authentication > Policies/Password
--      "Leaked password protection" (HaveIBeenPwned) aktivieren.
-- ============================================================
