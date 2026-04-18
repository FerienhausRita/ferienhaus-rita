-- Migration 021: Apartment name override
-- Allows admins to rename apartments without changing slugs/URLs.
-- NULL means: use the default name from src/data/apartments.ts

ALTER TABLE apartment_pricing
  ADD COLUMN IF NOT EXISTS name_override text;
