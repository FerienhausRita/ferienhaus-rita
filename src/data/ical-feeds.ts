/**
 * External iCal feed URLs für jedes Apartment.
 * Synced via /api/ical/sync (Vercel Cron, täglich 06:00) — gilt nur für
 * Plattformen, die wir IMPORTIEREN (also fremde Belegung in unsere DB
 * spiegeln).
 *
 * Mapping:
 * W1 (DG, 96m²)  = grossglockner-suite
 * W2 (OG, 96m²)  = gletscherblick
 * W3 (~50m²)     = almrausch
 * W4 (~40m²)     = edelweiss
 *
 * Aktuell keine externen Import-Quellen aktiv.
 *
 * - Smoobu: nicht mehr genutzt
 * - Airbnb: deaktiviert (Buchungen werden manuell im Admin erfasst).
 *   EXPORT an Airbnb läuft weiter über /api/ical/[apartment]/route.ts —
 *   davon ist diese Datei nicht betroffen.
 *
 * Hinweis: Der Live-Cron liest primär aus der DB-Tabelle `ical_import_feeds`
 * (im Admin unter „Einstellungen → iCal-Synchronisation" verwaltbar).
 * Diese Datei dient nur dem manuellen „iCal sync"-Button (triggerICalSync()).
 */
export const icalFeeds: Record<string, string[]> = {
  "grossglockner-suite": [],
  gletscherblick: [],
  almrausch: [],
  edelweiss: [],
};
