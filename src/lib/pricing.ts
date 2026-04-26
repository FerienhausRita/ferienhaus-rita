import { Apartment } from "@/data/apartments";
import {
  SeasonType,
  SeasonConfig,
  SeasonPeriod,
  SpecialPeriod,
  seasonConfigs as defaultSeasonConfigs,
  seasonPeriods as defaultSeasonPeriods,
  defaultSpecialPeriods,
  isWinterDate,
  getSpecialPeriodForDate,
} from "@/data/seasons";
import { localTax, vat } from "@/data/taxes";
import {
  DiscountCode,
  calculateDiscountAmount,
} from "@/data/discounts";

/**
 * Optional overrides for dynamic pricing from DB.
 * When provided, these take precedence over static file defaults.
 */
export interface PricingOverrides {
  /** @deprecated Legacy multiplier system */
  seasonConfigs?: Record<string, SeasonConfig>;
  /** @deprecated Legacy season periods */
  seasonPeriods?: SeasonPeriod[];
  /** Special periods with surcharges (new system) */
  specialPeriods?: SpecialPeriod[];
  localTaxPerNight?: number;
  /** Whether Kurtaxe is included in total_price (false = info-only, charged on site) */
  localTaxIncluded?: boolean;
  /** Age below which Kurtaxe is waived (default 15) */
  localTaxExemptAge?: number;
  vatRate?: number;
  /** Override min nights for summer */
  minNightsSummer?: number;
  /** Override min nights for winter */
  minNightsWinter?: number;
}

export interface BookingParams {
  apartment: Apartment;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  dogs: number;
  discount?: DiscountCode | null;
  /** Optional: DB-sourced pricing overrides */
  overrides?: PricingOverrides;
}

export interface SeasonBreakdownEntry {
  type: SeasonType;
  label: string;
  nights: number;
  pricePerNight: number;
  total: number;
}

export interface PriceBreakdown {
  nights: number;
  /** Weighted average base price per night (for display) */
  basePrice: number;
  basePriceTotal: number;
  /** Day-by-day season breakdown */
  seasonBreakdown: SeasonBreakdownEntry[];
  extraGuests: number;
  extraGuestsPricePerNight: number;
  extraGuestsTotal: number;
  /** Anzahl zusätzlicher Erwachsener (über baseGuests hinaus) */
  extraAdults: number;
  extraAdultsTotal: number;
  /** Anzahl zusätzlicher Kinder (über baseGuests hinaus) */
  extraChildren: number;
  extraChildrenTotal: number;
  dogsPricePerNight: number;
  dogsTotal: number;
  /** Anzahl Hunde (für Anzeige der Staffel) */
  dogsCount: number;
  firstDogFee: number;
  additionalDogFee: number;
  cleaningFee: number;
  /** Kurtaxe total — only non-zero when localTaxIncluded = true (Legacy) */
  localTaxTotal: number;
  /** Kurtaxe rate per adult per night (dynamic, from config) */
  localTaxPerNight: number;
  /** Age below which Kurtaxe is waived (default 15) */
  localTaxExemptAge: number;
  /** Whether Kurtaxe is included in the total_price */
  localTaxIncluded: boolean;
  /**
   * Informational Kurtaxe amount (adults × nights × rate) — always calculated,
   * used by hint texts even when the tax is not included in the total.
   */
  localTaxHint: number;
  /** Subtotal before discount */
  subtotal: number;
  /** Discount applied */
  discountLabel: string | null;
  discountAmount: number;
  total: number;
  /** VAT (MwSt) amount extracted from gross total (excludes Ortstaxe) */
  vatAmount: number;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Get the night price for a specific date using the summer/winter + special period model.
 */
function getNightPriceForDate(
  date: Date,
  apartment: Apartment,
  specialPeriods: SpecialPeriod[],
): { price: number; label: string; type: SeasonType } {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;

  // Determine base season (summer or winter)
  const winter = isWinterDate(mmdd);
  const basePrice = winter ? apartment.winterPrice : apartment.summerPrice;
  const baseLabel = winter ? "Winter" : "Sommer";
  const baseType: SeasonType = winter ? "winter" : "summer";

  // Check for special period surcharge
  const special = getSpecialPeriodForDate(mmdd, specialPeriods);
  if (special) {
    const surchargedPrice = Math.round(basePrice * (1 + special.surchargePercent / 100) * 100) / 100;
    return {
      price: surchargedPrice,
      label: `${special.label} (+${special.surchargePercent}%)`,
      type: "special",
    };
  }

  return { price: basePrice, label: baseLabel, type: baseType };
}

/**
 * Get the strictest minimum nights for a date range using new model.
 */
export function getMinNightsForRange(
  checkIn: Date,
  checkOut: Date,
  apartment: Apartment,
  specialPeriods: SpecialPeriod[],
  overrideMinSummer?: number,
  overrideMinWinter?: number,
): number {
  const minSummer = overrideMinSummer ?? apartment.minNightsSummer;
  const minWinter = overrideMinWinter ?? apartment.minNightsWinter;

  let maxMin = 1;
  const current = new Date(checkIn);
  while (current < checkOut) {
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    const mmdd = `${mm}-${dd}`;

    // Check special period first
    const special = getSpecialPeriodForDate(mmdd, specialPeriods);
    if (special && special.minNights !== null) {
      if (special.minNights > maxMin) maxMin = special.minNights;
    } else {
      // Base season min nights
      const baseMin = isWinterDate(mmdd) ? minWinter : minSummer;
      if (baseMin > maxMin) maxMin = baseMin;
    }

    current.setDate(current.getDate() + 1);
  }
  return maxMin;
}

/**
 * Legacy: Get season for a date using old multiplier system.
 * @deprecated Use getNightPriceForDate instead
 */
function getSeasonForDateWithOverrides(
  date: Date,
  overridePeriods?: SeasonPeriod[],
  overrideConfigs?: Record<string, SeasonConfig>
): SeasonConfig {
  const configs = overrideConfigs ?? defaultSeasonConfigs;
  const periods = overridePeriods ?? defaultSeasonPeriods;

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;

  for (const period of periods) {
    if (period.start <= period.end) {
      if (mmdd >= period.start && mmdd <= period.end) {
        return configs[period.type] ?? configs.low;
      }
    } else {
      if (mmdd >= period.start || mmdd <= period.end) {
        return configs[period.type] ?? configs.low;
      }
    }
  }

  return configs.low;
}

/**
 * Legacy: Get the strictest minimum nights for a date range (old system).
 * @deprecated Use getMinNightsForRange instead
 */
export function getMinNightsWithOverrides(
  checkIn: Date,
  checkOut: Date,
  overridePeriods?: SeasonPeriod[],
  overrideConfigs?: Record<string, SeasonConfig>
): number {
  let maxMin = 1;
  const current = new Date(checkIn);
  while (current < checkOut) {
    const season = getSeasonForDateWithOverrides(current, overridePeriods, overrideConfigs);
    if (season.minNights > maxMin) maxMin = season.minNights;
    current.setDate(current.getDate() + 1);
  }
  return maxMin;
}

/**
 * Detect whether apartment has summer/winter prices set.
 * If both are 0 or undefined, fall back to legacy multiplier system.
 */
function useNewPricingModel(apartment: Apartment): boolean {
  return (apartment.summerPrice > 0 || apartment.winterPrice > 0);
}

export function calculatePrice(params: BookingParams): PriceBreakdown {
  const { apartment, checkIn, checkOut, adults, children, dogs, discount, overrides } =
    params;
  const nights = calculateNights(checkIn, checkOut);
  // Personen-Kategorien (additiv):
  //   adults   = Erwachsene/Gäste ab 3 J. (zahlt vollen Tarif)
  //   children = ältere Kinder/Jugendliche (zusätzlich, gleicher Tarif)
  //              — neue Buchungen setzen 0; Bestandsbuchungen behalten Wert
  //   infants  = Kleinkinder unter 3 J. (kostenfrei, zählen nicht)
  // Auslastung = adults + children. Kleinkinder zählen nicht.
  const extraGuests = Math.max(0, adults + children - apartment.baseGuests);

  // Use overrides if provided
  const usedLocalTaxPerNight = overrides?.localTaxPerNight ?? localTax.perPersonPerNight;
  const usedLocalTaxIncluded =
    overrides?.localTaxIncluded ?? localTax.includedInTotal;
  const usedLocalTaxExemptAge =
    overrides?.localTaxExemptAge ?? localTax.exemptAge;
  const usedVatRate = overrides?.vatRate ?? vat.rate;

  // Day-by-day seasonal price calculation
  const seasonMap = new Map<
    string,
    { type: SeasonType; label: string; nights: number; pricePerNight: number; total: number }
  >();

  let basePriceTotal = 0;
  const current = new Date(checkIn);

  const newModel = useNewPricingModel(apartment);

  if (newModel) {
    // ── New pricing: summer/winter + special periods ──
    const specialPeriods = overrides?.specialPeriods ?? defaultSpecialPeriods;

    for (let i = 0; i < nights; i++) {
      const { price, label, type } = getNightPriceForDate(current, apartment, specialPeriods);

      const key = label; // Group by label (e.g., "Winter", "Sommer", "Weihnachten (+20%)")
      const existing = seasonMap.get(key);
      if (existing) {
        existing.nights += 1;
        existing.total += price;
      } else {
        seasonMap.set(key, {
          type,
          label,
          nights: 1,
          pricePerNight: price,
          total: price,
        });
      }

      basePriceTotal += price;
      current.setDate(current.getDate() + 1);
    }
  } else {
    // ── Legacy pricing: basePrice × multiplier ──
    for (let i = 0; i < nights; i++) {
      const season = getSeasonForDateWithOverrides(current, overrides?.seasonPeriods, overrides?.seasonConfigs);
      const nightPrice = Math.round(apartment.basePrice * season.multiplier * 100) / 100;

      const key = season.type;
      const existing = seasonMap.get(key);
      if (existing) {
        existing.nights += 1;
        existing.total += nightPrice;
      } else {
        seasonMap.set(key, {
          type: season.type,
          label: season.label,
          nights: 1,
          pricePerNight: nightPrice,
          total: nightPrice,
        });
      }

      basePriceTotal += nightPrice;
      current.setDate(current.getDate() + 1);
    }
  }

  const seasonBreakdown: SeasonBreakdownEntry[] = Array.from(
    seasonMap.entries()
  ).map(([, entry]) => ({
    type: entry.type,
    label: entry.label,
    nights: entry.nights,
    pricePerNight: entry.pricePerNight,
    total: Math.round(entry.total * 100) / 100,
  }));

  // Weighted average base price (for backward compatibility / display)
  const basePrice =
    nights > 0 ? Math.round((basePriceTotal / nights) * 100) / 100 : apartment.basePrice;

  // Einheitlicher Zusatzpersonentarif für alle Gäste ab 3 J.
  // Kleinkinder unter 3 (= `children`) zählen nicht zur Auslastung.
  // `extraChildren` bleibt im Breakdown für Backwards-Compat erhalten,
  // wird aber konsequent auf 0 gesetzt — keine separate Anzeige mehr.
  const extraAdultPrice =
    apartment.extraAdultPrice ?? apartment.extraPersonPrice;
  const extraAdults = extraGuests;
  const extraChildren = 0;
  const extraAdultsTotal =
    Math.round(extraAdults * extraAdultPrice * nights * 100) / 100;
  const extraChildrenTotal = 0;
  const extraGuestsTotal = extraAdultsTotal;
  const extraGuestsPricePerNight =
    extraGuests > 0 ? extraGuestsTotal / nights : 0;

  // Hunde-Staffelung: 1. Hund volle Gebühr, ab dem 2. ermäßigt.
  const firstDogFee = apartment.firstDogFee ?? apartment.dogFee;
  const additionalDogFee = apartment.additionalDogFee ?? apartment.dogFee;
  const dogsPricePerNight =
    dogs === 0 ? 0 : firstDogFee + Math.max(0, dogs - 1) * additionalDogFee;
  const dogsTotal = Math.round(dogsPricePerNight * nights * 100) / 100;

  const cleaningFee = apartment.cleaningFee;

  // Kurtaxe: only adults pay (children below exempt age are waived).
  // The hint amount is ALWAYS computed for display purposes.
  const localTaxHint =
    Math.round(adults * nights * usedLocalTaxPerNight * 100) / 100;

  // Legacy bookings include Kurtaxe in the total — new bookings don't.
  const localTaxTotal = usedLocalTaxIncluded ? localTaxHint : 0;

  const subtotal =
    basePriceTotal + extraGuestsTotal + dogsTotal + cleaningFee + localTaxTotal;

  // Discount
  let discountAmount = 0;
  let discountLabel: string | null = null;
  if (discount) {
    const discountableSubtotal = basePriceTotal + extraGuestsTotal + dogsTotal;
    discountAmount = calculateDiscountAmount(discount, discountableSubtotal);
    if (discountAmount > 0) {
      discountLabel = discount.label;
    }
  }

  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  // VAT: extracted from gross amounts that are subject to VAT.
  // Kurtaxe (when included in legacy bookings) is a public levy and not subject to VAT.
  const vatLiableGross = total - localTaxTotal;
  const vatAmount = Math.round((vatLiableGross / (1 + usedVatRate) * usedVatRate) * 100) / 100;

  return {
    nights,
    basePrice,
    basePriceTotal: Math.round(basePriceTotal * 100) / 100,
    seasonBreakdown,
    extraGuests,
    extraGuestsPricePerNight,
    extraGuestsTotal,
    extraAdults,
    extraAdultsTotal,
    extraChildren,
    extraChildrenTotal,
    dogsPricePerNight,
    dogsTotal,
    dogsCount: dogs,
    firstDogFee,
    additionalDogFee,
    cleaningFee,
    localTaxTotal,
    localTaxHint,
    localTaxPerNight: usedLocalTaxPerNight,
    localTaxExemptAge: usedLocalTaxExemptAge,
    localTaxIncluded: usedLocalTaxIncluded,
    subtotal: Math.round(subtotal * 100) / 100,
    discountLabel,
    discountAmount,
    total,
    vatAmount,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
