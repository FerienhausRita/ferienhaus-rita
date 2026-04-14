/**
 * Saisonale Preisgestaltung für Ferienhaus Rita.
 *
 * Neues Modell (ab 2026):
 * - Sommer (01.05. – 30.11.) und Winter (01.12. – 30.04.) als Basissaisons
 * - Jede Wohnung hat eigene Sommer-/Winterpreise
 * - Sonderzeiträume (Weihnachten, Fasching etc.) haben einen prozentualen Aufschlag
 *
 * Legacy-Typen (high/mid/low) bleiben für Abwärtskompatibilität erhalten.
 */

// ── Legacy types (kept for backward compatibility) ──

export type SeasonType = "summer" | "winter" | "special" | "high" | "mid" | "low";

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
  /** @deprecated Use apartment summer/winter prices instead */
  multiplier: number;
  /** Minimum number of nights required */
  minNights: number;
}

// ── New: Special Period ──

export interface SpecialPeriod {
  id?: string;
  label: string;
  startMmdd: string;
  endMmdd: string;
  surchargePercent: number;
  minNights: number | null;
  active: boolean;
}

// ── Default season boundaries ──

/** Winter season: December 1 – April 30 */
export const WINTER_START = "12-01";
export const WINTER_END = "04-30";

/** Summer season: May 1 – November 30 */
export const SUMMER_START = "05-01";
export const SUMMER_END = "11-30";

/**
 * Check if a MM-DD date falls in winter season.
 */
export function isWinterDate(mmdd: string): boolean {
  // Winter wraps around the year: 12-01 to 04-30
  return mmdd >= WINTER_START || mmdd <= WINTER_END;
}

/**
 * Check if a Date falls in winter season.
 */
export function isWinter(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return isWinterDate(`${mm}-${dd}`);
}

// ── Default special periods (fallback if DB is empty) ──

export const defaultSpecialPeriods: SpecialPeriod[] = [
  { label: "Weihnachten/Neujahr", startMmdd: "12-20", endMmdd: "01-06", surchargePercent: 20, minNights: 7, active: true },
  { label: "Fasching/Semesterferien", startMmdd: "02-01", endMmdd: "03-07", surchargePercent: 10, minNights: 5, active: true },
  { label: "Ostern", startMmdd: "03-20", endMmdd: "04-15", surchargePercent: 10, minNights: 5, active: true },
  { label: "Sommerferien", startMmdd: "07-01", endMmdd: "08-31", surchargePercent: 15, minNights: 5, active: true },
];

/**
 * Find matching special period for a MM-DD date.
 * Returns the first active match or null.
 */
export function getSpecialPeriodForDate(
  mmdd: string,
  specialPeriods: SpecialPeriod[]
): SpecialPeriod | null {
  for (const sp of specialPeriods) {
    if (!sp.active) continue;
    if (sp.startMmdd <= sp.endMmdd) {
      // Normal range (e.g., 07-01 to 08-31)
      if (mmdd >= sp.startMmdd && mmdd <= sp.endMmdd) return sp;
    } else {
      // Wrapping range (e.g., 12-20 to 01-06)
      if (mmdd >= sp.startMmdd || mmdd <= sp.endMmdd) return sp;
    }
  }
  return null;
}

// ── Legacy compatibility ──

export const seasonPeriods: SeasonPeriod[] = [
  { start: "12-20", end: "01-06", type: "high", label: "Winterhochsaison" },
  { start: "02-01", end: "03-07", type: "high", label: "Winterhochsaison" },
  { start: "07-01", end: "08-31", type: "high", label: "Sommerhochsaison" },
  { start: "01-07", end: "01-31", type: "mid", label: "Zwischensaison" },
  { start: "03-08", end: "04-20", type: "mid", label: "Zwischensaison" },
  { start: "06-01", end: "06-30", type: "mid", label: "Zwischensaison" },
  { start: "09-01", end: "10-15", type: "mid", label: "Zwischensaison" },
];

export const seasonConfigs: Record<string, SeasonConfig> = {
  high: { type: "high", label: "Hochsaison", multiplier: 1.3, minNights: 5 },
  mid: { type: "mid", label: "Zwischensaison", multiplier: 1.0, minNights: 3 },
  low: { type: "low", label: "Nebensaison", multiplier: 0.85, minNights: 2 },
  summer: { type: "summer", label: "Sommer", multiplier: 1.0, minNights: 3 },
  winter: { type: "winter", label: "Winter", multiplier: 1.0, minNights: 5 },
};

/** @deprecated Use isWinter() + specialPeriods instead */
export function getSeasonForDate(date: Date): SeasonConfig {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;

  for (const period of seasonPeriods) {
    if (period.start <= period.end) {
      if (mmdd >= period.start && mmdd <= period.end) {
        return seasonConfigs[period.type] ?? seasonConfigs.low;
      }
    } else {
      if (mmdd >= period.start || mmdd <= period.end) {
        return seasonConfigs[period.type] ?? seasonConfigs.low;
      }
    }
  }

  return seasonConfigs.low;
}

/** @deprecated */
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
