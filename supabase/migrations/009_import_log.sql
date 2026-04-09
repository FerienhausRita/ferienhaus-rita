-- Ferienhaus Rita – Import Log Table
-- Tracks Excel import operations for audit trail

create table public.import_log (
  id uuid primary key default uuid_generate_v4(),
  filename text not null,
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  imported_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.import_log enable row level security;

create policy "Service role full access on import_log"
  on public.import_log for all
  using (auth.role() = 'service_role');

create policy "Admins can read import_log"
  on public.import_log for select
  using (
    exists (
      select 1 from public.admin_profiles
      where id = auth.uid()
    )
  );
