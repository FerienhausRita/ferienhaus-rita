-- Ferienhaus Rita – Ausgaben-Tracking (Kosten) + Finanz-Übersicht
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Tabelle expenses: beliebige Ausgaben (Reinigung, Wartung, Material, Nebenkosten …)
-- optional je Wohnung / Buchung. Für die Finanz-Übersicht (echter Gewinn).

-- Sicherstellen, dass der Netto-Auszahlungsbetrag externer Plattformen existiert
-- (Migration 036 wurde in der DB nie eingespielt). Wird für die Provisions-
-- Berechnung (total_price − payout_amount) UND die bestehende Plattform-
-- Auszahlungs-Funktion benötigt.
alter table public.bookings
  add column if not exists payout_amount numeric;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null,
  amount numeric(10,2) not null,
  apartment_id text,
  booking_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date);

alter table public.expenses enable row level security;

-- Service-Role Vollzugriff (Admin-Aktionen laufen über den Service-Role-Client)
drop policy if exists "Service role full access on expenses" on public.expenses;
create policy "Service role full access on expenses"
  on public.expenses for all
  using (auth.role() = 'service_role');

-- Admins dürfen verwalten (Fallback, falls direkt über den Auth-Client genutzt)
drop policy if exists "Admins manage expenses" on public.expenses;
create policy "Admins manage expenses"
  on public.expenses for all
  using (
    auth.uid() is not null and exists (
      select 1 from public.admin_profiles where id = auth.uid()
    )
  );
