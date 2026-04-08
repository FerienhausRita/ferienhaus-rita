/**
 * External iCal feed URLs for each apartment.
 * Smoobu iCal export URLs – synced via /api/ical/sync
 *
 * Mapping:
 * W1 (DG, 96m²)  = grossglockner-suite
 * W2 (OG, 96m²)  = gletscherblick
 * W3 (~50m²)     = almrausch
 * W4 (~40m²)     = edelweiss
 */
export const icalFeeds: Record<string, string[]> = {
  "grossglockner-suite": [
    "https://login.smoobu.com/ical/3240557.ics?s=YAfqbbm2WH",
  ],
  gletscherblick: [
    "https://login.smoobu.com/ical/3242967.ics?s=o6FNs8kBpB",
  ],
  almrausch: [
    "https://login.smoobu.com/ical/3242977.ics?s=vMDExsmPyD",
  ],
  edelweiss: [
    "https://login.smoobu.com/ical/3242982.ics?s=DgcCSL%2FWMR",
  ],
};
