/**
 * Zentrale Datum/Zeit-Formatierungen für die Admin-UI.
 *
 * Das Problem: `new Date(iso).toLocaleString("de-AT", ...)` nutzt die Zeitzone
 * des jeweiligen Browsers. Wenn der Admin mal im Home-Office surft (z.B.
 * Zeitzonenreise, Serverless-Umgebung mit UTC-Default) sieht der Zeitstempel
 * um 1–2 Stunden falsch aus.
 *
 * Alle Admin-Seiten sollten diese Helpers nutzen, damit Zeitstempel **immer
 * in Europe/Vienna** erscheinen.
 */

const TIMEZONE = "Europe/Vienna";

/** TT.MM.JJJJ, HH:MM — z.B. "24.04.2026, 10:00" */
export function formatAdminDateTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

/** TT.MM.JJJJ — z.B. "24.04.2026" */
export function formatAdminDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

/** HH:MM — z.B. "10:00" */
export function formatAdminTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}
