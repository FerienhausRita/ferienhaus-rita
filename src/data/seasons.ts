/**
 * Saisonale Preisgestaltung für Ferienhaus Rita.
 *
 * Saisons gelten nach Aufenthaltsdatum (Tag-für-Tag-Berechnung).
 * Jeder Tag wird einzeln einer Saison zugeordnet, sodass ein Aufenthalt
 * über mehrere Saisons korrekt berechnet wird.
 */

export type SeasonType = "high" | "mid" | "low";

export interface SeasonPeriod {
  /** Inclusive start, format MM-DD */
  start: string;
  /** Inclusive end, format MM-DD */
  end: string;
  type: SeasonType;
  label: string;
}

export interface SeasonConfig {
  type: SeasonType;
  label: string;
  /** Multiplier applied to the apartment's basePrice (1.0 = no change) */
  multiplier: number;
  /** Minimum number of nights required */
  minNights: number;
}

/**
 * Season definitions by calendar period.
 * Order matters: first matching period wins.
 */
export const seasonPeriods: SeasonPeriod[] = [
  // Winter high season (Christmas/New Year + February school holidays)
  { start: "12-20", end: "01-06", type: "high", label: "Winterhochsaison" },
  { start: "02-01", end: "03-07", type: "high", label: "Winterhochsaison" },

  // Summer high season
  { start: "07-01", end: "08-31", type: "high", label: "Sommerhochsaison" },

  // Mid season (shoulder months with good tourism)
  { start: "01-07", end: "01-31", type: "mid", label: "Zwischensaison" },
  { start: "03-08", end: "04-20", type: "mid", label: "Zwischensaison" },
  { start: "06-01", end: "06-30", type: "mid", label: "Zwischensaison" },
  { start: "09-01", end: "10-15", type: "mid", label: "Zwischensaison" },

  // Everything else is low season (April–May, October–December)
];

/** Pricing rules per season type */
export const seasonConfigs: Record<SeasonType, SeasonConfig> = {
  high: {
    type: "high",
    label: "Hochsaison",
    multiplier: 1.3,
    minNights: 5,
  },
  mid: {
    type: "mid",
    label: "Zwischensaison",
    multiplier: 1.0,
    minNights: 3,
  },
  low: {
    type: "low",
    label: "Nebensaison",
    multiplier: 0.85,
    minNights: 2,
  },
};

/**
 * Determine which season a specific date falls into.
 */
export function getSeasonForDate(date: Date): SeasonConfig {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;

  for (const period of seasonPeriods) {
    if (period.start <= period.end) {
      // Normal range (e.g. 07-01 to 08-31)
      if (mmdd >= period.start && mmdd <= period.end) {
        return seasonConfigs[period.type];
      }
    } else {
      // Wrapping range (e.g. 12-20 to 01-06)
      if (mmdd >= period.start || mmdd <= period.end) {
        return seasonConfigs[period.type];
      }
    }
  }

  // Default: low season
  return seasonConfigs.low;
}

/**
 * Get the strictest (highest) minimum nights for a date range.
 */
export function getMinNights(checkIn: Date, checkOut: Date): number {
  let maxMin = 1;
  const current = new Date(checkIn);
  while (current < checkOut) {
    const season = getSeasonForDate(current);
    if (season.minNights > maxMin) maxMin = season.minNights;
    current.setDate(current.getDate() + 1);
  }
  return maxMin;
}
