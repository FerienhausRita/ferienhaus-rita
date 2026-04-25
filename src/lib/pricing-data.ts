/**
 * Server-only module: Fetches pricing data from Supabase
 * and merges it with static apartment metadata.
 *
 * This is the single source of truth for all pricing data.
 * Static files (apartments.ts, seasons.ts, taxes.ts) serve as fallbacks.
 */

import { createServerClient } from "@/lib/supabase/server";
import { apartments, Apartment, getApartmentById as getStaticApartment, getApartmentBySlug as getStaticApartmentBySlug } from "@/data/apartments";
import { seasonConfigs as staticSeasonConfigs, seasonPeriods as staticSeasonPeriods, SeasonConfig, SeasonPeriod, SpecialPeriod, defaultSpecialPeriods } from "@/data/seasons";
import { localTax as staticLocalTax, vat as staticVat } from "@/data/taxes";

// Re-export types
export type { Apartment } from "@/data/apartments";
export type { SeasonConfig, SeasonPeriod, SpecialPeriod } from "@/data/seasons";

export interface TaxConfig {
  localTaxPerNight: number;
  /** Whether Kurtaxe is included in total_price (false = charged separately on site) */
  localTaxIncluded: boolean;
  /** Age below which Kurtaxe is waived */
  localTaxExemptAge: number;
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
      .select("apartment_id, name_override, base_price, summer_price, winter_price, extra_person_price, extra_adult_price, extra_child_price, cleaning_fee, dog_fee, first_dog_fee, additional_dog_fee, min_nights_summer, min_nights_winter");

    if (!pricing || pricing.length === 0) {
      return apartments;
    }

    const pricingMap = new Map(pricing.map((p) => [p.apartment_id, p]));

    return apartments.map((apt) => {
      const dbPrice = pricingMap.get(apt.id);
      if (!dbPrice) return apt;
      const override = (dbPrice as { name_override?: string | null }).name_override;
      const extra = dbPrice as {
        extra_adult_price?: number | null;
        extra_child_price?: number | null;
        first_dog_fee?: number | null;
        additional_dog_fee?: number | null;
      };
      const extraPerson = Number(dbPrice.extra_person_price);
      const dogFeeRaw = Number(dbPrice.dog_fee);
      return {
        ...apt,
        name: override && override.trim() ? override.trim() : apt.name,
        basePrice: Number(dbPrice.base_price),
        summerPrice: Number(dbPrice.summer_price ?? dbPrice.base_price),
        winterPrice: Number(dbPrice.winter_price ?? dbPrice.base_price),
        extraPersonPrice: extraPerson,
        extraAdultPrice: extra.extra_adult_price != null ? Number(extra.extra_adult_price) : extraPerson,
        extraChildPrice: extra.extra_child_price != null ? Number(extra.extra_child_price) : 20,
        cleaningFee: Number(dbPrice.cleaning_fee),
        dogFee: dogFeeRaw,
        firstDogFee: extra.first_dog_fee != null ? Number(extra.first_dog_fee) : dogFeeRaw,
        additionalDogFee: extra.additional_dog_fee != null ? Number(extra.additional_dog_fee) : 7.50,
        minNightsSummer: Number(dbPrice.min_nights_summer ?? apt.minNightsSummer),
        minNightsWinter: Number(dbPrice.min_nights_winter ?? apt.minNightsWinter),
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
 * Get a map of apartment_id → current display name (with DB override applied).
 * Use this in server components/routes that only need to display names.
 */
export async function getApartmentNameMap(): Promise<Map<string, string>> {
  const all = await getAllApartmentsWithPricing();
  return new Map(all.map((a) => [a.id, a.name]));
}

/**
 * Get special periods from DB.
 */
export async function getSpecialPeriodsFromDB(): Promise<SpecialPeriod[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("special_periods")
      .select("id, label, start_mmdd, end_mmdd, surcharge_percent, min_nights, active")
      .order("start_mmdd", { ascending: true });

    if (!data || data.length === 0) {
      return defaultSpecialPeriods;
    }

    return data.map((row) => ({
      id: row.id,
      label: row.label,
      startMmdd: row.start_mmdd,
      endMmdd: row.end_mmdd,
      surchargePercent: Number(row.surcharge_percent),
      minNights: row.min_nights !== null ? Number(row.min_nights) : null,
      active: row.active ?? true,
    }));
  } catch {
    return defaultSpecialPeriods;
  }
}

/**
 * @deprecated Get season configs from DB (legacy multiplier system).
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
 * @deprecated Get season periods from DB (legacy multiplier system).
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
  const fallback: TaxConfig = {
    localTaxPerNight: staticLocalTax.perPersonPerNight,
    localTaxIncluded: staticLocalTax.includedInTotal,
    localTaxExemptAge: staticLocalTax.exemptAge,
    vatRate: staticVat.rate,
  };
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("tax_config")
      .select("key, rate, included");

    if (!data || data.length === 0) {
      return fallback;
    }

    const byKey = new Map(data.map((r) => [r.key, r]));
    const local = byKey.get("local_tax");
    const vat = byKey.get("vat");

    return {
      localTaxPerNight: local ? Number(local.rate) : fallback.localTaxPerNight,
      localTaxIncluded:
        local && local.included !== null && local.included !== undefined
          ? Boolean(local.included)
          : fallback.localTaxIncluded,
      localTaxExemptAge: staticLocalTax.exemptAge,
      vatRate: vat ? Number(vat.rate) : fallback.vatRate,
    };
  } catch {
    return fallback;
  }
}

/**
 * Recalculate booking prices using the full pricing engine.
 * Used by import flows and the "Neu berechnen" button.
 * Returns null if apartment not found.
 */
export async function recalculateBookingPrices(params: {
  apartmentId: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children: number;
  dogs: number;
}): Promise<import("@/lib/pricing").PriceBreakdown | null> {
  const { calculatePrice } = await import("@/lib/pricing");

  const apartment = await getApartmentWithPricing(params.apartmentId);
  if (!apartment) return null;

  const [specialPeriods, taxConfig] = await Promise.all([
    getSpecialPeriodsFromDB(),
    getTaxConfigFromDB(),
  ]);

  const checkIn = new Date(params.checkIn + "T00:00:00");
  const checkOut = new Date(params.checkOut + "T00:00:00");

  return calculatePrice({
    apartment,
    checkIn,
    checkOut,
    adults: params.adults,
    children: params.children,
    dogs: params.dogs,
    overrides: {
      specialPeriods,
      localTaxPerNight: taxConfig.localTaxPerNight,
      localTaxIncluded: taxConfig.localTaxIncluded,
      localTaxExemptAge: taxConfig.localTaxExemptAge,
      vatRate: taxConfig.vatRate,
    },
  });
}

/**
 * Get ALL pricing data in a single call (for BookingFlow props).
 */
export async function getAllPricingData() {
  const [allApartments, specialPeriods, seasonConfigs, seasonPeriods, taxConfig] = await Promise.all([
    getAllApartmentsWithPricing(),
    getSpecialPeriodsFromDB(),
    getSeasonConfigsFromDB(),
    getSeasonPeriodsFromDB(),
    getTaxConfigFromDB(),
  ]);

  return { apartments: allApartments, specialPeriods, seasonConfigs, seasonPeriods, taxConfig };
}
