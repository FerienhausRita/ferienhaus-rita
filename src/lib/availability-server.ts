import { createServerClient } from "@/lib/supabase/server";

/**
 * Check if an apartment is available for the given date range.
 * Queries both bookings (non-cancelled) and blocked_dates.
 * Used in API routes only (server-side).
 */
export async function isAvailableDB(
  apartmentId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Check for conflicting bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("apartment_id", apartmentId)
    .not("status", "eq", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .limit(1);

  if (bookings && bookings.length > 0) return false;

  // Check for blocked dates
  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("apartment_id", apartmentId)
    .lt("start_date", checkOut)
    .gt("end_date", checkIn)
    .limit(1);

  if (blocked && blocked.length > 0) return false;

  return true;
}

/**
 * Get all unavailable dates for an apartment in a given month.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export async function getUnavailableDatesDB(
  apartmentId: string,
  year: number,
  month: number
): Promise<string[]> {
  const supabase = createServerClient();
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = new Date(year, month, 0); // last day of month
  const endStr = `${year}-${String(month).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

  // Get bookings that overlap with this month
  const { data: bookings } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("apartment_id", apartmentId)
    .not("status", "eq", "cancelled")
    .lt("check_in", endStr)
    .gt("check_out", startOfMonth);

  // Get blocked dates that overlap
  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("start_date, end_date")
    .eq("apartment_id", apartmentId)
    .lt("start_date", endStr)
    .gt("end_date", startOfMonth);

  const unavailable = new Set<string>();

  const addRange = (start: string, end: string) => {
    const s = new Date(Math.max(new Date(start).getTime(), new Date(startOfMonth).getTime()));
    const e = new Date(Math.min(new Date(end).getTime(), new Date(endStr).getTime()));
    const current = new Date(s);
    while (current <= e) {
      unavailable.add(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
  };

  bookings?.forEach((b) => addRange(b.check_in, b.check_out));
  blocked?.forEach((b) => addRange(b.start_date, b.end_date));

  return Array.from(unavailable).sort();
}
