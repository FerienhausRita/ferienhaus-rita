-- Ferienhaus Rita – Dynamic Pricing + Guests Table
-- Run this in the Supabase SQL Editor

-- ============================================
-- APARTMENT PRICING (editable from admin)
-- ============================================
create table public.apartment_pricing (
  id uuid primary key default uuid_generate_v4(),
  apartment_id text not null unique,
  base_price numeric not null,
  extra_person_price numeric not null,
  cleaning_fee numeric not null,
  dog_fee numeric not null,
  updated_at timestamptz not null default now()
);

create trigger apartment_pricing_updated_at
  before update on public.apartment_pricing
  for each row execute function public.update_updated_at();

alter table public.apartment_pricing enable row level security;

create policy "Public can read apartment_pricing"
  on public.apartment_pricing for select using (true);

create policy "Service role full access on apartment_pricing"
  on public.apartment_pricing for all
  using (auth.role() = 'service_role');

create policy "Admins can manage apartment_pricing"
  on public.apartment_pricing for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- Seed with current prices from src/data/apartments.ts
insert into public.apartment_pricing (apartment_id, base_price, extra_person_price, cleaning_fee, dog_fee) values
  ('grossglockner-suite', 170, 20, 100, 15),
  ('gletscherblick', 170, 20, 100, 15),
  ('almrausch', 90, 20, 50, 15),
  ('edelweiss', 90, 20, 50, 15);

-- ============================================
-- SEASON CONFIGS (multiplier + min nights)
-- ============================================
create table public.season_configs (
  id uuid primary key default uuid_generate_v4(),
  type text not null unique check (type in ('high', 'mid', 'low')),
  label text not null,
  multiplier numeric not null,
  min_nights integer not null,
  updated_at timestamptz not null default now()
);

create trigger season_configs_updated_at
  before update on public.season_configs
  for each row execute function public.update_updated_at();

alter table public.season_configs enable row level security;

create policy "Public can read season_configs"
  on public.season_configs for select using (true);

create policy "Service role full access on season_configs"
  on public.season_configs for all
  using (auth.role() = 'service_role');

create policy "Admins can manage season_configs"
  on public.season_configs for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

insert into public.season_configs (type, label, multiplier, min_nights) values
  ('high', 'Hochsaison', 1.3, 5),
  ('mid', 'Zwischensaison', 1.0, 3),
  ('low', 'Nebensaison', 0.85, 2);

-- ============================================
-- SEASON PERIODS (date ranges)
-- ============================================
create table public.season_periods (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('high', 'mid', 'low')),
  start_mmdd text not null,
  end_mmdd text not null,
  label text not null
);

alter table public.season_periods enable row level security;

create policy "Public can read season_periods"
  on public.season_periods for select using (true);

create policy "Service role full access on season_periods"
  on public.season_periods for all
  using (auth.role() = 'service_role');

create policy "Admins can manage season_periods"
  on public.season_periods for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

insert into public.season_periods (type, start_mmdd, end_mmdd, label) values
  ('high', '12-20', '01-06', 'Winterhochsaison'),
  ('high', '02-01', '03-07', 'Winterhochsaison'),
  ('high', '07-01', '08-31', 'Sommerhochsaison'),
  ('mid', '01-07', '01-31', 'Zwischensaison'),
  ('mid', '03-08', '04-20', 'Zwischensaison'),
  ('mid', '06-01', '06-30', 'Zwischensaison'),
  ('mid', '09-01', '10-15', 'Zwischensaison');

-- ============================================
-- TAX CONFIG
-- ============================================
create table public.tax_config (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  rate numeric not null,
  label text not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger tax_config_updated_at
  before update on public.tax_config
  for each row execute function public.update_updated_at();

alter table public.tax_config enable row level security;

create policy "Public can read tax_config"
  on public.tax_config for select using (true);

create policy "Service role full access on tax_config"
  on public.tax_config for all
  using (auth.role() = 'service_role');

create policy "Admins can manage tax_config"
  on public.tax_config for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

insert into public.tax_config (key, rate, label, description) values
  ('local_tax', 2.50, 'Ortstaxe', 'Pro Person pro Nacht, Kinder unter 15 befreit'),
  ('vat', 0.10, 'MwSt', 'Ermäßigter Satz 10% für Beherbergung');

-- ============================================
-- GUESTS TABLE
-- ============================================
create table public.guests (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  street text,
  zip text,
  city text,
  country text default 'AT',
  notes text,
  total_stays integer not null default 0,
  total_revenue numeric not null default 0,
  first_visit date,
  last_visit date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.update_updated_at();

alter table public.guests enable row level security;

create policy "Service role full access on guests"
  on public.guests for all
  using (auth.role() = 'service_role');

create policy "Admins can manage guests"
  on public.guests for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- Add guest_id FK to bookings
alter table public.bookings add column guest_id uuid references public.guests(id);
create index idx_bookings_guest_id on public.bookings (guest_id);

-- Backfill: Create guest records from existing bookings
insert into public.guests (email, first_name, last_name, phone, street, zip, city, country, total_stays, total_revenue, first_visit, last_visit)
select
  b.email,
  (array_agg(b.first_name order by b.created_at desc))[1],
  (array_agg(b.last_name order by b.created_at desc))[1],
  (array_agg(b.phone order by b.created_at desc))[1],
  (array_agg(b.street order by b.created_at desc))[1],
  (array_agg(b.zip order by b.created_at desc))[1],
  (array_agg(b.city order by b.created_at desc))[1],
  (array_agg(b.country order by b.created_at desc))[1],
  count(*)::integer,
  coalesce(sum(b.total_price), 0),
  min(b.check_in),
  max(b.check_in)
from public.bookings b
where b.status != 'cancelled'
group by b.email
on conflict (email) do nothing;

-- Backfill: Set guest_id on existing bookings
update public.bookings b
set guest_id = g.id
from public.guests g
where b.email = g.email and b.guest_id is null;
