import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentBySlugWithPricing } from "@/lib/pricing-data";
import { generateICal } from "@/lib/ical";
import { getMaxBookingDate } from "@/lib/availability-server";

/**
 * GET /api/ical/[apartment]
 *
 * Returns an iCal feed (.ics) for the given apartment.
 * Smoobu (or any channel manager) can import this URL
 * to sync bookings from our website.
 *
 * Example: /api/ical/grossglockner-suite
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { apartment: string } }
) {
  const apartment = await getApartmentBySlugWithPricing(params.apartment);
  if (!apartment) {
    return NextResponse.json(
      { error: "Apartment not found" },
      { status: 404 }
    );
  }

  try {
    const supabase = createServerClient();

    // Fetch all non-cancelled bookings for this apartment (next 18 months)
    const today = new Date().toISOString().split("T")[0];
    const futureLimit = new Date();
    futureLimit.setMonth(futureLimit.getMonth() + 18);
    const futureLimitStr = futureLimit.toISOString().split("T")[0];

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, first_name, last_name")
      .eq("apartment_id", apartment.id)
      .not("status", "eq", "cancelled")
      .gte("check_out", today)
      .lte("check_in", futureLimitStr);

    // Fetch blocked dates
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, reason")
      .eq("apartment_id", apartment.id)
      .gte("end_date", today)
      .lte("start_date", futureLimitStr);

    const events: {
      uid: string;
      start: string;
      end: string;
      summary: string;
    }[] = [];

    // Add bookings as events (privacy: only show "Booked", not guest names)
    bookings?.forEach((b) => {
      events.push({
        uid: `booking-${b.id}@ferienhaus-rita-kals.at`,
        start: b.check_in,
        end: b.check_out,
        summary: "Belegt",
      });
    });

    // Add blocked dates
    blocked?.forEach((b) => {
      events.push({
        uid: `blocked-${b.id}@ferienhaus-rita-kals.at`,
        start: b.start_date,
        end: b.end_date,
        summary: b.reason || "Blockiert",
      });
    });

    // Block everything after max_booking_date
    const maxDate = await getMaxBookingDate();
    if (maxDate && maxDate < futureLimitStr) {
      // Add one large block from max_booking_date to future limit
      const nextDay = new Date(maxDate + "T00:00:00");
      nextDay.setDate(nextDay.getDate() + 1);
      events.push({
        uid: `max-booking-limit@ferienhaus-rita-kals.at`,
        start: nextDay.toISOString().split("T")[0],
        end: futureLimitStr,
        summary: "Nicht buchbar",
      });
    }

    const ical = generateICal(apartment.name, events);

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${apartment.slug}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("iCal export error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 }
    );
  }
}
