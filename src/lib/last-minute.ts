import { createServerClient } from "@/lib/supabase/server";
import { isAvailableDB } from "@/lib/availability-server";
import { getAllPricingData } from "@/lib/pricing-data";
import { calculatePrice, getMinNightsWithOverrides } from "@/lib/pricing";
import { todayISO } from "@/lib/dates";
import {
  type LastMinuteConfig,
  LAST_MINUTE_DEFAULTS as DEFAULTS,
  daysUntil,
  lastMinuteDiscountFor,
} from "@/lib/last-minute-shared";

// Re-export der reinen Logik/Typen (client-sicher in last-minute-shared.ts).
export { lastMinuteDiscountFor };
export type { LastMinuteConfig };

// Konfiguration DB-getrieben (site_settings key "lastminute_config"):
//   { enabled, days_threshold, discount_percent, code }
export async function getLastMinuteConfig(): Promise<LastMinuteConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "lastminute_config")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, unknown>;
    return {
      enabled: v.enabled != null ? Boolean(v.enabled) : DEFAULTS.enabled,
      daysThreshold: Number(v.days_threshold ?? DEFAULTS.daysThreshold),
      discountPercent: Number(v.discount_percent ?? DEFAULTS.discountPercent),
      code: (v.code as string) || DEFAULTS.code,
    };
  } catch {
    return DEFAULTS;
  }
}

function addDaysISO(iso: string, n: number): string {
  const t = Date.parse(iso + "T00:00:00Z") + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export interface LastMinuteOffer {
  apartmentId: string;
  slug: string;
  name: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  image: string | null;
  pricePerNight: number; // regulär (saison-korrekt)
  discountedPerNight: number; // nach Rabatt
}

/**
 * Ermittelt je Wohnung den FRÜHESTEN freien Zeitraum mit Anreise innerhalb der
 * Schwelle (Mindestnächte je Wohnung/Saison). Preise saison-korrekt aus der
 * Engine, Rabatt angewandt. Nur wenn Last-Minute aktiv ist.
 */
export async function getLastMinuteOffers(): Promise<{
  enabled: boolean;
  discountPercent: number;
  daysThreshold: number;
  offers: LastMinuteOffer[];
}> {
  const cfg = await getLastMinuteConfig();
  if (!cfg.enabled) {
    return { enabled: false, discountPercent: cfg.discountPercent, daysThreshold: cfg.daysThreshold, offers: [] };
  }

  const pricing = await getAllPricingData();
  const overrides = {
    seasonConfigs: pricing.seasonConfigs,
    seasonPeriods: pricing.seasonPeriods,
    specialPeriods: pricing.specialPeriods,
    localTaxPerNight: pricing.taxConfig.localTaxPerNight,
    vatRate: pricing.taxConfig.vatRate,
  };

  const today = todayISO();
  const offers: LastMinuteOffer[] = [];

  for (const apt of pricing.apartments) {
    if (apt.available === false) continue;

    // Frühesten freien Zeitraum mit Anreise innerhalb der Schwelle suchen —
    // Mindestnächte saison-korrekt (Sommer 3 / Winter 5 etc.), damit der
    // vorgeschlagene Zeitraum am Checkout nicht an der Mindestaufenthaltsregel scheitert.
    let found: { checkIn: string; checkOut: string; nights: number } | null = null;
    for (let d = 0; d <= cfg.daysThreshold; d++) {
      const checkIn = addDaysISO(today, d);
      if (daysUntil(checkIn) > cfg.daysThreshold) break;
      const ciDate = new Date(checkIn + "T00:00:00");
      const minNights = Math.max(
        1,
        getMinNightsWithOverrides(
          ciDate,
          new Date(ciDate.getTime() + 86400000),
          pricing.seasonPeriods,
          pricing.seasonConfigs
        )
      );
      const checkOut = addDaysISO(checkIn, minNights);
      const ok = await isAvailableDB(apt.id, checkIn, checkOut);
      if (ok) {
        found = { checkIn, checkOut, nights: minNights };
        break;
      }
    }
    if (!found) continue;

    const checkInDate = new Date(found.checkIn + "T00:00:00");
    const checkOutDate = new Date(found.checkOut + "T00:00:00");
    const discount = lastMinuteDiscountFor(found.checkIn, cfg);
    let regularPerNight = Number(apt.summerPrice ?? apt.basePrice ?? 0);
    try {
      const bd = calculatePrice({
        apartment: apt,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: Math.min(2, Number(apt.baseGuests ?? 2)),
        children: 0,
        dogs: 0,
        overrides,
      });
      if (bd?.basePrice) regularPerNight = bd.basePrice;
    } catch {
      /* Fallback: summerPrice/basePrice */
    }
    const discountedPerNight =
      Math.round(regularPerNight * (1 - cfg.discountPercent / 100) * 100) / 100;

    const image = Array.isArray(apt.images) && apt.images.length > 0 ? apt.images[0] : null;

    offers.push({
      apartmentId: apt.id,
      slug: apt.slug,
      name: apt.name,
      checkIn: found.checkIn,
      checkOut: found.checkOut,
      nights: found.nights,
      image,
      pricePerNight: regularPerNight,
      discountedPerNight,
    });
  }

  return {
    enabled: true,
    discountPercent: cfg.discountPercent,
    daysThreshold: cfg.daysThreshold,
    offers,
  };
}
