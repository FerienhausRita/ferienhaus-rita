/**
 * Client-side availability checking via the /api/availability endpoint.
 *
 * All functions are async and fetch real data from the server.
 */

/**
 * Check whether an apartment is available for the given date range.
 * Fetches unavailable dates for each month in the range and checks for overlap.
 */
export async function isAvailable(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const unavailable = await getUnavailableDatesForRange(
    apartmentId,
    checkIn,
    checkOut
  );

  // Check if any day in the booking range overlaps with unavailable dates
  const current = new Date(checkIn);
  while (current < checkOut) {
    const dateStr = toISODate(current);
    if (unavailable.has(dateStr)) {
      return false;
    }
    current.setDate(current.getDate() + 1);
  }
  return true;
}

/**
 * Get unavailable dates for a single month from the API.
 * Returns an array of Date objects for the unavailable days.
 */
export async function getUnavailableDates(
  apartmentId: string,
  month: Date
): Promise<Date[]> {
  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const dateStrings = await fetchUnavailableDates(apartmentId, monthStr);
  return dateStrings.map((s) => new Date(s));
}

/**
 * Fetch unavailable date strings for a given month from the API.
 */
async function fetchUnavailableDates(
  apartmentId: string,
  monthStr: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `/api/availability?apartmentId=${encodeURIComponent(apartmentId)}&month=${encodeURIComponent(monthStr)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.unavailableDates || [];
  } catch {
    return [];
  }
}

/**
 * Collect unavailable dates across all months spanned by a date range.
 * Returns a Set of ISO date strings (YYYY-MM-DD).
 */
async function getUnavailableDatesForRange(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date
): Promise<Set<string>> {
  // Determine which months we need to fetch
  const months: string[] = [];
  const current = new Date(checkIn.getFullYear(), checkIn.getMonth(), 1);
  const end = new Date(checkOut.getFullYear(), checkOut.getMonth(), 1);

  while (current <= end) {
    months.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  // Fetch all months in parallel
  const results = await Promise.all(
    months.map((m) => fetchUnavailableDates(apartmentId, m))
  );

  const allDates = new Set<string>();
  for (const dates of results) {
    for (const d of dates) {
      allDates.add(d);
    }
  }
  return allDates;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
