/**
 * Datums-Helfer mit fester Geschäfts-Zeitzone Europe/Vienna.
 *
 * Hintergrund: `new Date().toISOString().split("T")[0]` liefert das Datum in
 * UTC. Auf dem Server (Vercel läuft in UTC) und im Browser kann das in den
 * frühen Morgenstunden österreichischer Zeit einen Tag zu früh sein. Diese
 * Helfer rechnen explizit in Europe/Vienna und sind dadurch überall korrekt.
 */

const VIENNA_TZ = "Europe/Vienna";

const viennaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIENNA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Kalenderdatum (YYYY-MM-DD) eines Zeitpunkts in der Zeitzone Europe/Vienna. */
export function toViennaISODate(date: Date = new Date()): string {
  const parts = viennaDateFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Heutiges Datum (YYYY-MM-DD) in Europe/Vienna. */
export function todayISO(): string {
  return toViennaISODate();
}
