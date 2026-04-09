-- Ferienhaus Rita – Digitaler Meldeschein (Austrian Guest Registration)

create table public.meldeschein (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,

  -- Primary guest (Hauptgast)
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  nationality text not null default 'AT',
  id_type text not null default 'id_card'
    check (id_type in ('passport', 'id_card', 'drivers_license')),
  id_number text not null,
  street text not null,
  zip text not null,
  city text not null,
  country text not null default 'AT',

  -- Companions (Mitreisende) as JSONB array
  -- Each: { first_name, last_name, date_of_birth, nationality }
  companions jsonb not null default '[]'::jsonb,

  -- Stay period
  arrival_date date not null,
  departure_date date not null,

  -- Status tracking
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'verified')),
  completed_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger meldeschein_updated_at
  before update on public.meldeschein
  for each row execute function public.update_updated_at();

create index idx_meldeschein_booking_id on public.meldeschein (booking_id);

alter table public.meldeschein enable row level security;

create policy "Service role full access on meldeschein"
  on public.meldeschein for all
  using (auth.role() = 'service_role');

create policy "Admins can manage meldeschein"
  on public.meldeschein for all
  using (
    exists (
      select 1 from public.admin_profiles
      where id = auth.uid()
    )
  );
