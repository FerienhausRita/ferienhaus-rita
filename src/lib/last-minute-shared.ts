import type { DiscountCode } from "@/data/discounts";
import { todayISO } from "@/lib/dates";

// Reine, client-sichere Last-Minute-Logik (KEINE Server-Imports!).
// Wird sowohl serverseitig (Buchung) als auch im Browser (Preisvorschau) genutzt,
// damit angezeigter und berechneter Preis garantiert identisch sind.

export interface LastMinuteConfig {
  enabled: boolean;
  daysThreshold: number; // Anreise in <= N Tagen
  discountPercent: number;
  code: string;
}

export const LAST_MINUTE_DEFAULTS: LastMinuteConfig = {
  enabled: true,
  daysThreshold: 14,
  discountPercent: 20,
  code: "LASTMINUTE",
};

/** Kalendertage bis zur Anreise (TZ-sicher über ISO-Datumsstrings). */
export function daysUntil(checkInISO: string): number {
  const a = Date.parse(todayISO() + "T00:00:00Z");
  const b = Date.parse(checkInISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

/**
 * Liefert den Last-Minute-Rabatt (als DiscountCode) NUR wenn die Anreise
 * innerhalb der Schwelle liegt — sonst null.
 */
export function lastMinuteDiscountFor(
  checkInISO: string,
  cfg: LastMinuteConfig
): DiscountCode | null {
  if (!cfg.enabled || cfg.discountPercent <= 0 || !checkInISO) return null;
  const d = daysUntil(checkInISO);
  if (d < 0 || d > cfg.daysThreshold) return null;
  return {
    code: cfg.code,
    type: "percent",
    value: cfg.discountPercent,
    label: `Last-Minute −${cfg.discountPercent}%`,
    maxUses: 0,
  };
}
