/**
 * Server-only module: Fetches pricing data from Supabase
 * and merges it with static apartment metadata.
 *
 * This is the single source of truth for all pricing data.
 * Static files (apartments.ts, seasons.ts, taxes.ts) serve as fallbacks.
 */

import { createServerClient } from "@/lib/supabase/server";
import { apartments, Apartment, getApartmentById as getStaticApartment, getApartmentBySlug as getStaticApartmentBySlug } from "@/data/apartments";
import { seasonConfigs as staticSeasonConfigs, seasonPeriods as staticSeasonPeriods, SeasonConfig, SeasonPeriod } from "@/data/seasons";
import { localTax as staticLocalTax, vat as staticVat } from "@/data/taxes";

// Re-export types
export type { Apartment } from "@/data/apartments";
export type { SeasonConfig, SeasonPeriod } from "@/data/seasons";

export interface TaxConfig {
  localTaxPerNight: number;
  vatRate: number;
}

/**
 * Get all apartments with current DB pricing merged in.
 * Falls back to static data if DB is unreachable.
 */
export async function getAllApartmentsWithPricing(): Promise<Apartment[]> {
  try {
    const supabase = createServerClient();
    const { data: pricing } = await supabase
      .from("apartment_pricing")
      .select("apartment_id, base_price, extra_person_price, cleaning_fee, dog_fee");

    if (!pricing || pricing.length === 0) {
      return apartments;
    }

    const pricingMap = new Map(pricing.map((p) => [p.apartment_id, p]));

    return apartments.map((apt) => {
      const dbPrice = pricingMap.get(apt.id);
      if (!dbPrice) return apt;
      return {
        ...apt,
        basePrice: Number(dbPrice.base_price),
        extraPersonPrice: Number(dbPrice.extra_person_price),
        cleaningFee: Number(dbPrice.cleaning_fee),
        dogFee: Number(dbPrice.dog_fee),
      };
    });
  } catch {
    return apartments;
  }
}

/**
 * Get a single apartment by ID with DB pricing.
 */
export async function getApartmentWithPricing(id: string): Promise<Apartment | undefined> {
  const all = await getAllApartmentsWithPricing();
  return all.find((a) => a.id === id);
}

/**
 * Get a single apartment by slug with DB pricing.
 */
export async function getApartmentBySlugWithPricing(slug: string): Promise<Apartment | undefined> {
  const all = await getAllApartmentsWithPricing();
  return all.find((a) => a.slug === slug);
}

/**
 * Get season configs from DB.
 */
export async function getSeasonConfigsFromDB(): Promise<Record<string, SeasonConfig>> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("season_configs")
      .select("type, label, multiplier, min_nights");

    if (!data || data.length === 0) {
      return staticSeasonConfigs;
    }

    const configs: Record<string, SeasonConfig> = {};
    for (const row of data) {
      configs[row.type] = {
        type: row.type as "high" | "mid" | "low",
        label: row.label,
        multiplier: Number(row.multiplier),
        minNights: Number(row.min_nights),
      };
    }
    return configs;
  } catch {
    return staticSeasonConfigs;
  }
}

/**
 * Get season periods from DB.
 */
export async function getSeasonPeriodsFromDB(): Promise<SeasonPeriod[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("season_periods")
      .select("id, type, start_mmdd, end_mmdd, label")
      .order("start_mmdd", { ascending: true });

    if (!data || data.length === 0) {
      return staticSeasonPeriods;
    }

    return data.map((row) => ({
      start: row.start_mmdd,
      end: row.end_mmdd,
      type: row.type as "high" | "mid" | "low",
      label: row.label,
    }));
  } catch {
    return staticSeasonPeriods;
  }
}

/**
 * Get tax config from DB.
 */
export async function getTaxConfigFromDB(): Promise<TaxConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("tax_config")
      .select("key, rate");

    if (!data || data.length === 0) {
      return {
        localTaxPerNight: staticLocalTax.perPersonPerNight,
        vatRate: staticVat.rate,
      };
    }

    const configMap = new Map(data.map((r) => [r.key, Number(r.rate)]));
    return {
      localTaxPerNight: configMap.get("local_tax") ?? staticLocalTax.perPersonPerNight,
      vatRate: configMap.get("vat") ?? staticVat.rate,
    };
  } catch {
    return {
      localTaxPerNight: staticLocalTax.perPersonPerNight,
      vatRate: staticVat.rate,
    };
  }
}

/**
 * Get ALL pricing data in a single call (for BookingFlow props).
 */
export async function getAllPricingData() {
  const [allApartments, seasonConfigs, seasonPeriods, taxConfig] = await Promise.all([
    getAllApartmentsWithPricing(),
    getSeasonConfigsFromDB(),
    getSeasonPeriodsFromDB(),
    getTaxConfigFromDB(),
  ]);

  return { apartments: allApartments, seasonConfigs, seasonPeriods, taxConfig };
}
