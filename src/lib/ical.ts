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
): { start: string; end: string; summary: string; description: string }[] {
  const events: { start: string; end: string; summary: string; description: string }[] = [];
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

    // DESCRIPTION can be multi-line (folded with leading space/tab in iCal)
    let description = "";
    const descIdx = block.indexOf("DESCRIPTION:");
    if (descIdx !== -1) {
      // Extract from DESCRIPTION: to the next property (line not starting with space/tab)
      const afterDesc = block.slice(descIdx + "DESCRIPTION:".length);
      const lines = afterDesc.split(/\r?\n/);
      const descLines: string[] = [];
      for (let j = 0; j < lines.length; j++) {
        if (j === 0) {
          descLines.push(lines[j]);
        } else if (lines[j].match(/^[ \t]/)) {
          // Continuation line
          descLines.push(lines[j].slice(1));
        } else {
          break;
        }
      }
      description = descLines
        .join("")
        .replace(/\\n/g, " ")
        .replace(/\\,/g, ",")
        .trim();
    }

    if (startMatch && endMatch) {
      events.push({
        start: `${startMatch[1]}-${startMatch[2]}-${startMatch[3]}`,
        end: `${endMatch[1]}-${endMatch[2]}-${endMatch[3]}`,
        summary: summaryMatch ? summaryMatch[1].trim() : "Blocked (Smoobu)",
        description,
      });
    }
  }

  return events;
}
