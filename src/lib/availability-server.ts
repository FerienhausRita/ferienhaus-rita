import { createServerClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

/**
 * Get the max booking date from site_settings.
 * Returns null if no limit is set.
 */
export async function getMaxBookingDate(): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "max_booking_date")
    .single();

  if (!data?.value) return null;
  // Value is stored as string "YYYY-MM-DD"
  const dateStr = typeof data.value === "string" ? data.value : data.value?.date;
  return dateStr || null;
}

/**
 * Check if an apartment is available for the given date range.
 * Queries both bookings (non-cancelled) and blocked_dates.
 * Also respects the max_booking_date setting.
 * Used in API routes only (server-side).
 */
export async function isAvailableDB(
  apartmentId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Check max booking date limit
  const maxDate = await getMaxBookingDate();
  if (maxDate && checkOut > maxDate) return false;

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

export interface BookingConflict {
  type: "booking";
  id: string;
  first_name: string | null;
  last_name: string | null;
  check_in: string;
  check_out: string;
  status: string;
}

export interface BlockedDateConflict {
  type: "blocked";
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface AvailabilityConflicts {
  available: boolean;
  beyondMaxDate: boolean;
  maxDate: string | null;
  bookings: BookingConflict[];
  blocked: BlockedDateConflict[];
}

/**
 * Detailed availability check — returns the actual conflicting bookings
 * and blocked-date ranges so the UI can show meaningful warnings.
 * `excludeBookingId` lets us ignore the booking currently being edited.
 */
export async function getAvailabilityConflicts(
  apartmentId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<AvailabilityConflicts> {
  const supabase = createServerClient();

  const maxDate = await getMaxBookingDate();
  const beyondMaxDate = !!(maxDate && checkOut > maxDate);

  let bookingsQuery = supabase
    .from("bookings")
    .select("id, first_name, last_name, check_in, check_out, status")
    .eq("apartment_id", apartmentId)
    .not("status", "eq", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);
  if (excludeBookingId) {
    bookingsQuery = bookingsQuery.neq("id", excludeBookingId);
  }
  const { data: bookings } = await bookingsQuery;

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason")
    .eq("apartment_id", apartmentId)
    .lt("start_date", checkOut)
    .gt("end_date", checkIn);

  const bookingConflicts: BookingConflict[] = (bookings ?? []).map((b) => ({
    type: "booking",
    id: b.id,
    first_name: b.first_name,
    last_name: b.last_name,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status,
  }));

  const blockedConflicts: BlockedDateConflict[] = (blocked ?? []).map((b) => ({
    type: "blocked",
    id: b.id,
    start_date: b.start_date,
    end_date: b.end_date,
    reason: b.reason ?? null,
  }));

  return {
    available:
      !beyondMaxDate && bookingConflicts.length === 0 && blockedConflicts.length === 0,
    beyondMaxDate,
    maxDate,
    bookings: bookingConflicts,
    blocked: blockedConflicts,
  };
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

  // Block all dates after max_booking_date
  const maxDate = await getMaxBookingDate();
  if (maxDate) {
    const maxD = new Date(maxDate + "T00:00:00");
    const endD = new Date(endStr + "T00:00:00");
    // If max date falls within or before this month, block from day after max to end of month
    if (maxD <= endD) {
      const blockStart = new Date(Math.max(maxD.getTime(), new Date(startOfMonth + "T00:00:00").getTime()));
      const cursor = new Date(blockStart);
      while (cursor <= endD) {
        unavailable.add(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  return Array.from(unavailable).sort();
}

// ============================================
// ALTERNATIV-ZEITRÄUME (Vorschläge bei Belegung)
// ============================================

export interface AlternativeSuggestion {
  apartmentId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  /** Abstand zum Wunsch-Anreisedatum in Tagen (negativ = früher). */
  offsetDays: number;
}

/** Kalender-Datumsarithmetik in UTC (reine Tagesverschiebung, zeitzonen-neutral). */
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Findet je Wohnung den zeitlich nächstgelegenen freien Zeitraum gleicher Länge,
 * gesucht in beide Richtungen ab desiredCheckIn. Max. ein Vorschlag pro Wohnung,
 * sortiert nach Nähe zum Wunschdatum. Berücksichtigt max_booking_date und keine
 * Termine in der Vergangenheit.
 */
export async function findAlternativeRanges(params: {
  apartmentIds: string[];
  desiredCheckIn: string;
  nights: number;
  forwardDays?: number;
  backwardDays?: number;
}): Promise<AlternativeSuggestion[]> {
  const { apartmentIds, desiredCheckIn, nights } = params;
  if (apartmentIds.length === 0 || nights < 1) return [];
  const forwardDays = params.forwardDays ?? 365;
  const backwardDays = params.backwardDays ?? 90;

  const supabase = createServerClient();
  const today = todayISO();
  const maxDate = await getMaxBookingDate();

  const rawStart = addDaysISO(desiredCheckIn, -backwardDays);
  const searchStart = rawStart < today ? today : rawStart;
  const searchEnd = addDaysISO(desiredCheckIn, forwardDays);
  const fetchLimit = addDaysISO(searchEnd, nights + 1);

  // Kandidaten-Offsets nach Nähe zum Wunschdatum (+1, -1, +2, -2, …); 0 entfällt
  // (der Wunschzeitraum ist ja belegt).
  const offsets: number[] = [];
  for (let off = 1; off <= forwardDays; off++) {
    offsets.push(off);
    if (off <= backwardDays) offsets.push(-off);
  }

  const suggestions: AlternativeSuggestion[] = [];

  for (const apartmentId of apartmentIds) {
    const [{ data: bookings }, { data: blocked }] = await Promise.all([
      supabase
        .from("bookings")
        .select("check_in, check_out")
        .eq("apartment_id", apartmentId)
        .not("status", "eq", "cancelled")
        .lt("check_in", fetchLimit)
        .gt("check_out", searchStart),
      supabase
        .from("blocked_dates")
        .select("start_date, end_date")
        .eq("apartment_id", apartmentId)
        .lt("start_date", fetchLimit)
        .gt("end_date", searchStart),
    ]);

    // Belegte Tage als Set aufbauen — gleiche (inklusive) Semantik wie
    // getUnavailableDatesDB, das die Buchungsseite nutzt. So sind vorgeschlagene
    // Zeiträume garantiert auch wirklich buchbar (sonst würde die Seite sie
    // beim Übernehmen wieder ablehnen).
    const occupied = new Set<string>();
    const mark = (start: string, end: string) => {
      let cur = start;
      while (cur <= end) {
        occupied.add(cur);
        cur = addDaysISO(cur, 1);
      }
    };
    for (const b of bookings ?? []) mark(b.check_in, b.check_out);
    for (const bl of blocked ?? []) mark(bl.start_date, bl.end_date);

    const isFree = (ci: string, co: string): boolean => {
      if (maxDate && co > maxDate) return false;
      // Prüfe alle Übernachtungen ci .. co-1 (Abreisetag co zählt nicht).
      for (let d = ci; d < co; d = addDaysISO(d, 1)) {
        if (occupied.has(d)) return false;
      }
      return true;
    };

    for (const off of offsets) {
      const ci = addDaysISO(desiredCheckIn, off);
      if (ci < today || ci < searchStart || ci > searchEnd) continue;
      const co = addDaysISO(ci, nights);
      if (isFree(ci, co)) {
        suggestions.push({ apartmentId, checkIn: ci, checkOut: co, nights, offsetDays: off });
        break;
      }
    }
  }

  suggestions.sort((a, b) => Math.abs(a.offsetDays) - Math.abs(b.offsetDays));
  return suggestions;
}
