-- Ferienhaus Rita – Notes, Tasks & Email Log
-- Run this in the Supabase SQL Editor

-- ============================================
-- BOOKING NOTES (internal notes per booking)
-- ============================================
create table public.booking_notes (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_name text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_booking_notes_booking on public.booking_notes (booking_id);

alter table public.booking_notes enable row level security;

create policy "Service role full access on booking_notes"
  on public.booking_notes for all
  using (auth.role() = 'service_role');

create policy "Admins can manage booking_notes"
  on public.booking_notes for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- ============================================
-- GUEST EMAILS (log of sent emails)
-- ============================================
create table public.guest_emails (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete set null,
  guest_email text not null,
  subject text not null,
  body text not null,
  sent_by uuid not null references auth.users(id),
  sent_by_name text not null default '',
  sent_at timestamptz not null default now()
);

create index idx_guest_emails_booking on public.guest_emails (booking_id);
create index idx_guest_emails_guest on public.guest_emails (guest_email);

alter table public.guest_emails enable row level security;

create policy "Service role full access on guest_emails"
  on public.guest_emails for all
  using (auth.role() = 'service_role');

create policy "Admins can manage guest_emails"
  on public.guest_emails for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));

-- ============================================
-- TASKS (operational tasks)
-- ============================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id) on delete set null,
  apartment_id text,
  title text not null,
  description text,
  due_date date,
  category text not null default 'allgemein'
    check (category in ('anreise', 'abreise', 'reinigung', 'wartung', 'allgemein')),
  status text not null default 'offen'
    check (status in ('offen', 'erledigt')),
  assigned_to uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_status on public.tasks (status);
create index idx_tasks_due_date on public.tasks (due_date);
create index idx_tasks_booking on public.tasks (booking_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

alter table public.tasks enable row level security;

create policy "Service role full access on tasks"
  on public.tasks for all
  using (auth.role() = 'service_role');

create policy "Admins can manage tasks"
  on public.tasks for all
  using (auth.uid() is not null and exists (
    select 1 from public.admin_profiles where id = auth.uid()
  ));
