-- Ferienhaus Rita – Admin Dashboard Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- ADMIN PROFILES (linked to Supabase Auth)
-- ============================================
create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  role text not null default 'admin'
    check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create trigger admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.update_updated_at();

-- RLS
alter table public.admin_profiles enable row level security;

create policy "Service role full access on admin_profiles"
  on public.admin_profiles for all
  using (auth.role() = 'service_role');

create policy "Admins can read own profile"
  on public.admin_profiles for select
  using (auth.uid() = id);

-- ============================================
-- PAYMENT STATUS on bookings
-- ============================================
alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid';

-- Add check constraint (separate statement for compatibility)
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'bookings' and constraint_name = 'bookings_payment_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (payment_status in ('unpaid', 'partial', 'paid', 'refunded'));
  end if;
end $$;

-- ============================================
-- RLS POLICIES for authenticated admin users
-- ============================================

-- Bookings: Admins can read and update
create policy "Authenticated admins can read bookings"
  on public.bookings for select
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

create policy "Authenticated admins can update bookings"
  on public.bookings for update
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- Blocked dates: Admins can manage
create policy "Authenticated admins can insert blocked_dates"
  on public.blocked_dates for insert
  with check (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

create policy "Authenticated admins can delete blocked_dates"
  on public.blocked_dates for delete
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- Contact messages: Admins can read and update
create policy "Authenticated admins can read contact_messages"
  on public.contact_messages for select
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

create policy "Authenticated admins can update contact_messages"
  on public.contact_messages for update
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));
