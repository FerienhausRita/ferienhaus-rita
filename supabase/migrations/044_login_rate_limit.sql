-- 044_login_rate_limit.sql
-- Rate-Limiting für den Gast-Login (/api/guest-auth): protokolliert Login-Versuche
-- je IP, damit die Route Brute-Force (8-Hex-Code + Nachname) drosseln kann.
-- Zugriff nur via Service-Role (die Route) -> RLS an, keine Policy. Idempotent.

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_ip_time
  on public.login_attempts (ip, created_at desc);

alter table public.login_attempts enable row level security;
-- Keine Policy: nur service_role (BYPASSRLS) schreibt/liest; anon/authenticated gesperrt.
