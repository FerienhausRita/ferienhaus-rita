-- Ferienhaus Rita – Buchhaltung: USt/Vorsteuer + Beleg-Pfad an Ausgaben
-- Idempotent: kann mehrfach ausgeführt werden.

alter table public.expenses
  add column if not exists net_amount numeric,
  add column if not exists vat_rate numeric,
  add column if not exists vat_amount numeric,
  add column if not exists payment_method text,
  add column if not exists receipt_path text;
