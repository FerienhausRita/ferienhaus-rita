/**
 * iCal generation and parsing utilities.
 * Used for Smoobu / channel manager synchronization.
 */

/**
 * Generate an iCal VCALENDAR string from booking/blocked events.
 */
export function generateICal(
  apartmentName: string,
  events: { uid: string; start: string; end: string; summary: string }[]
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const vevents = events
    .map(
      (e) => `BEGIN:VEVENT
DTSTART;VALUE=DATE:${e.start.replace(/-/g, "")}
DTEND;VALUE=DATE:${e.end.replace(/-/g, "")}
DTSTAMP:${now}
UID:${e.uid}
SUMMARY:${e.summary}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT`
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ferienhaus Rita//Booking//DE",
    `X-WR-CALNAME:${apartmentName} - Ferienhaus Rita`,
    "METHOD:PUBLISH",
    "CALSCALE:GREGORIAN",
    vevents,
    "END:VCALENDAR",
  ]
    .join("\r\n")
    .trim();
}

/**
 * Parse an iCal feed and extract blocked date ranges.
 * Returns array of { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', summary: string }
 */
export function parseICal(
  icalString: string
): { start: string; end: string; summary: string }[] {
  const events: { start: string; end: string; summary: string }[] = [];
  const blocks = icalString.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const startMatch = block.match(
      /DTSTART(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/
    );
    const endMatch = block.match(
      /DTEND(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/
    );
    const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n|\r)/);

    if (startMatch && endMatch) {
      events.push({
        start: `${startMatch[1]}-${startMatch[2]}-${startMatch[3]}`,
        end: `${endMatch[1]}-${endMatch[2]}-${endMatch[3]}`,
        summary: summaryMatch ? summaryMatch[1].trim() : "Blocked (Smoobu)",
      });
    }
  }

  return events;
}
