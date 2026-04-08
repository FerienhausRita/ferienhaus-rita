-- Ferienhaus Rita – Add seasonal pricing columns to bookings
-- Run this AFTER 001_initial.sql

-- Add local tax, discount, and seasonal pricing columns
alter table public.bookings
  add column if not exists local_tax_total numeric(10,2) not null default 0,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(10,2) not null default 0;
