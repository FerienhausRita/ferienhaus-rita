-- Ferienhaus Rita – Wohnungsfotos-Verwaltung
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Tabelle apartment_images: pro Wohnung beliebig viele Fotos.
-- Die Dateien liegen im Storage-Bucket "apartment-images"; hier steht nur der Pfad.
-- apartment_id ist der slug (z.B. "gletscherblick"), passend zu apartment_pricing.

create table if not exists public.apartment_images (
  id uuid primary key default gen_random_uuid(),
  apartment_id text not null,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists apartment_images_apartment_id_idx
  on public.apartment_images (apartment_id, sort_order);

alter table public.apartment_images enable row level security;

-- Service-Role Vollzugriff (Admin-Uploads laufen über den Service-Role-Client)
drop policy if exists "Service role full access on apartment_images" on public.apartment_images;
create policy "Service role full access on apartment_images"
  on public.apartment_images for all
  using (auth.role() = 'service_role');

-- Öffentliches Lesen (Fotos erscheinen auf der Website)
drop policy if exists "Public read apartment_images" on public.apartment_images;
create policy "Public read apartment_images"
  on public.apartment_images for select
  using (true);

-- Admins dürfen verwalten (Fallback, falls direkt über den Auth-Client genutzt)
drop policy if exists "Admins manage apartment_images" on public.apartment_images;
create policy "Admins manage apartment_images"
  on public.apartment_images for all
  using (
    auth.uid() is not null and exists (
      select 1 from public.admin_profiles where id = auth.uid()
    )
  );
