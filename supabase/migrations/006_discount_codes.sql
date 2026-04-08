-- Ferienhaus Rita – Discount Codes in Database
-- Run this in the Supabase SQL Editor

create table public.discount_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  type text not null default 'percent' check (type in ('percent', 'fixed')),
  value numeric not null,
  label text not null,
  min_subtotal numeric default 0,
  max_uses integer default 0,
  current_uses integer default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_discount_codes_code on public.discount_codes (code);

create trigger discount_codes_updated_at
  before update on public.discount_codes
  for each row execute function public.update_updated_at();

alter table public.discount_codes enable row level security;

create policy "Service role full access on discount_codes"
  on public.discount_codes for all
  using (auth.role() = 'service_role');

create policy "Admins can manage discount_codes"
  on public.discount_codes for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- Anyone can read active discount codes (for validation in booking flow)
create policy "Public can read active discount_codes"
  on public.discount_codes for select
  using (active = true);

-- Seed with existing codes from src/data/discounts.ts
insert into public.discount_codes (code, type, value, label, min_subtotal, max_uses) values
  ('WILLKOMMEN10', 'percent', 10, '10% Willkommensrabatt', 0, 0),
  ('FRUEHBUCHER', 'percent', 5, '5% Frühbucherrabatt', 500, 0);
