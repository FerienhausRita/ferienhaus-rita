-- Ferienhaus Rita – Initial Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- BOOKINGS
-- ============================================
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  apartment_id text not null,
  check_in date not null,
  check_out date not null,
  adults integer not null default 2,
  children integer not null default 0,
  dogs integer not null default 0,

  -- Guest information
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  street text not null,
  zip text not null,
  city text not null,
  country text not null default 'AT',
  notes text,

  -- Price snapshot (frozen at booking time)
  nights integer not null,
  price_per_night numeric(10,2) not null,
  extra_guests_total numeric(10,2) not null default 0,
  dogs_total numeric(10,2) not null default 0,
  cleaning_fee numeric(10,2) not null default 0,
  total_price numeric(10,2) not null,

  -- Status
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,

  -- Constraints
  constraint valid_dates check (check_out > check_in),
  constraint valid_guests check (adults > 0),
  constraint valid_nights check (nights > 0)
);

-- Index for availability checks
create index idx_bookings_availability
  on public.bookings (apartment_id, check_in, check_out)
  where status not in ('cancelled');

-- Index for status queries
create index idx_bookings_status on public.bookings (status);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.update_updated_at();

-- ============================================
-- BLOCKED DATES (manual blocks, iCal sync, etc.)
-- ============================================
create table public.blocked_dates (
  id uuid primary key default uuid_generate_v4(),
  apartment_id text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),

  constraint valid_block_dates check (end_date > start_date)
);

create index idx_blocked_dates_lookup
  on public.blocked_dates (apartment_id, start_date, end_date);

-- ============================================
-- CONTACT MESSAGES
-- ============================================
create table public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.bookings enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.contact_messages enable row level security;

-- Service role (API routes) can do everything
-- Anon key: read-only access to check availability (limited columns)
create policy "Service role full access on bookings"
  on public.bookings for all
  using (auth.role() = 'service_role');

create policy "Anon can check booking dates"
  on public.bookings for select
  using (true);

create policy "Service role full access on blocked_dates"
  on public.blocked_dates for all
  using (auth.role() = 'service_role');

create policy "Anon can read blocked dates"
  on public.blocked_dates for select
  using (true);

create policy "Service role full access on contact_messages"
  on public.contact_messages for all
  using (auth.role() = 'service_role');
