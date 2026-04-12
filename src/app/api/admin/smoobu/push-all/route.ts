import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createSmoobuClient } from "@/lib/smoobu/client";
import { isSmoobuEnabled, getSmoobuApartmentId } from "@/lib/smoobu/mapping";
import { pushBookingToSmoobu } from "@/lib/smoobu/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Push ALL existing website bookings (confirmed/pending) to Smoobu
 * with full guest data. This replaces bare date-blocks with real reservations.
 */
export async function POST() {
  const enabled = await isSmoobuEnabled();
  if (!enabled) {
    return NextResponse.json({ success: false, error: "Smoobu nicht aktiviert" });
  }

  const smoobu = createSmoobuClient();
  if (!smoobu) {
    return NextResponse.json({ success: false, error: "Smoobu Client nicht konfiguriert" });
  }

  const supabase = createServerClient();

  // Get all local bookings that haven't been synced to Smoobu yet
  // (no smoobu_reservation_id or sync failed)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, apartment_id, first_name, last_name, check_in, check_out, smoobu_reservation_id, smoobu_sync_status")
    .in("status", ["confirmed", "pending"])
    .or("smoobu_reservation_id.is.null,smoobu_sync_status.eq.failed")
    .order("check_in", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({
      success: true,
      stats: { total: 0, pushed: 0, skipped: 0, failed: 0 },
      message: "Keine Buchungen zum Synchronisieren gefunden",
    });
  }

  const stats = { total: bookings.length, pushed: 0, skipped: 0, failed: 0 };

  for (const booking of bookings) {
    // Check if apartment is mapped
    const smoobuId = await getSmoobuApartmentId(booking.apartment_id);
    if (!smoobuId) {
      stats.skipped++;
      continue;
    }

    try {
      const success = await pushBookingToSmoobu(booking.id);
      if (success) {
        stats.pushed++;
      } else {
        stats.failed++;
      }
    } catch (err) {
      console.error(`Bulk push failed for ${booking.id}:`, err);
      stats.failed++;
    }

    // Small delay to respect rate limit (1000 req/min)
    await new Promise((r) => setTimeout(r, 100));
  }

  return NextResponse.json({ success: true, stats });
}
