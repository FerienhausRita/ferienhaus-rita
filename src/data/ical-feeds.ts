/**
 * External iCal feed URLs for each apartment.
 * Synced via /api/ical/sync (Vercel Cron, täglich 06:00)
 *
 * Mapping:
 * W1 (DG, 96m²)  = grossglockner-suite
 * W2 (OG, 96m²)  = gletscherblick
 * W3 (~50m²)     = almrausch
 * W4 (~40m²)     = edelweiss
 *
 * Quellen: Smoobu + Airbnb iCal
 */
export const icalFeeds: Record<string, string[]> = {
  "grossglockner-suite": [
    "https://login.smoobu.com/ical/3240557.ics?s=YAfqbbm2WH",
    "https://www.airbnb.de/calendar/ical/1662358419016161878.ics?t=c25400ade2ab4db39e32dbfcd42215e9",
  ],
  gletscherblick: [
    "https://login.smoobu.com/ical/3242967.ics?s=o6FNs8kBpB",
    "https://www.airbnb.de/calendar/ical/1658111635029895521.ics?t=2d6c4d44115d432db0d37eaf70b48d9d",
  ],
  almrausch: [
    "https://login.smoobu.com/ical/3242977.ics?s=vMDExsmPyD",
  ],
  edelweiss: [
    "https://login.smoobu.com/ical/3242982.ics?s=DgcCSL%2FWMR",
  ],
};
