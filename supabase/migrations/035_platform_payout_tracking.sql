-- Ferienhaus Rita – Plattform-Auszahlungs-Tracking
-- Externe Buchungen (Airbnb/Booking.com/Holidu/…) gelten nicht mehr sofort
-- als "paid", sondern als "platform_pending" mit erwartetem Auszahlungsdatum.
-- Erst nach Bestätigung des Geldeingangs werden sie auf "paid" gesetzt.
-- Idempotent.

-- 1) payment_status-Constraint um 'platform_pending' erweitern
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'deposit_paid', 'paid', 'refunded', 'platform_pending'));

-- 2) Felder für die erwartete/erfolgte Auszahlung
alter table public.bookings
  add column if not exists expected_payout_date date,
  add column if not exists payout_confirmed_at timestamptz;

create index if not exists idx_bookings_platform_pending
  on public.bookings (expected_payout_date)
  where payment_status = 'platform_pending';

-- 3) Konfigurierbare Auszahlungs-Fristen je Kanal
insert into public.site_settings (key, value)
values (
  'platform_payout_config',
  '{
    "Airbnb":       { "ref": "checkin",  "days": 1 },
    "Booking.com":  { "ref": "checkout", "days": 3 },
    "Holidu":       { "ref": "checkout", "days": 7 },
    "Andere":       { "ref": "checkout", "days": 5 }
  }'::jsonb
)
on conflict (key) do nothing;
