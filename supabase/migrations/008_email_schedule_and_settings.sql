-- Ferienhaus Rita – Phase 5: Email Scheduling + Site Settings
-- Run this in the Supabase SQL Editor

-- ============================================
-- SITE SETTINGS (Key-Value Store)
-- ============================================
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "Service role full access on site_settings"
  on public.site_settings for all using (auth.role() = 'service_role');

create policy "Admins can manage site_settings"
  on public.site_settings for all using (
    auth.uid() is not null and exists (select 1 from public.admin_profiles where id = auth.uid())
  );

-- Seed defaults
insert into public.site_settings (key, value) values
  ('bank_details', '{"iban": "", "bic": "", "account_holder": "", "bank_name": ""}'::jsonb),
  ('checkin_info', '{"key_handoff": "Schlüsselbox am Eingang, Code wird per E-Mail mitgeteilt.", "address": "Großdorf 83, 9981 Kals am Großglockner", "parking": "Kostenlose Parkplätze direkt am Haus.", "house_rules": "Ruhezeiten 22:00–07:00. Rauchverbot in allen Innenräumen.", "directions": "Von Lienz auf der B108 Richtung Kals am Großglockner. Im Ort der Beschilderung Richtung Großdorf folgen."}'::jsonb),
  ('email_timing', '{"payment_reminder_days": 7, "checkin_info_days": 3, "thankyou_days": 1}'::jsonb),
  ('review_link', '{"google_url": "", "enabled": false}'::jsonb),
  ('invoice_counter', '{"year": 2026, "next_number": 1}'::jsonb);

-- ============================================
-- EMAIL SCHEDULE
-- ============================================
create table public.email_schedule (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  email_type text not null check (email_type in (
    'confirmation', 'payment_reminder', 'checkin_info', 'thankyou'
  )),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_email_schedule_pending on public.email_schedule (status, scheduled_for)
  where status = 'pending';
create index idx_email_schedule_booking on public.email_schedule (booking_id);

alter table public.email_schedule enable row level security;

create policy "Service role full access on email_schedule"
  on public.email_schedule for all using (auth.role() = 'service_role');

create policy "Admins can manage email_schedule"
  on public.email_schedule for all using (
    auth.uid() is not null and exists (select 1 from public.admin_profiles where id = auth.uid())
  );

-- ============================================
-- INVOICE NUMBER ON BOOKINGS
-- ============================================
alter table public.bookings add column if not exists invoice_number text;
