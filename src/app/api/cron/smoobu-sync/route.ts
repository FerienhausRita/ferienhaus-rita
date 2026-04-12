import { NextRequest, NextResponse } from "next/server";
import { createSmoobuClient } from "@/lib/smoobu/client";
import { createServerClient } from "@/lib/supabase/server";
import { isSmoobuEnabled, getSmoobuConfig } from "@/lib/smoobu/mapping";
import { syncReservationFromSmoobu, pushBookingToSmoobu } from "@/lib/smoobu/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full sync

export async function GET(request: NextRequest) {
  // Verify cron secret or Vercel cron header
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const isVercelCron = !!vercelCron;
    const hasValidSecret = authHeader === `Bearer ${cronSecret}`;
    // Allow: Vercel cron, valid secret, or requests from admin (via referer)
    const isAdminTrigger = request.headers.get("referer")?.includes("/admin/");
    if (!isVercelCron && !hasValidSecret && !isAdminTrigger) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const enabled = await isSmoobuEnabled();
  if (!enabled) {
    return NextResponse.json({ message: "Smoobu integration disabled" });
  }

  const smoobu = createSmoobuClient();
  if (!smoobu) {
    return NextResponse.json({ error: "Smoobu client not configured" }, { status: 500 });
  }

  const supabase = createServerClient();
  const stats = { pulled: 0, updated: 0, skipped: 0, retried: 0, errors: 0 };

  try {
    // ── 1. Pull reservations from Smoobu ──

    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30); // 30 days back (catch recent changes)
    const to = new Date(today);
    to.setFullYear(to.getFullYear() + 1); // 1 year ahead

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await smoobu.getReservations({
        from: fromStr,
        to: toStr,
        page,
        pageSize: 50,
        showCancellation: true,
      });

      totalPages = response.page_count;

      for (const reservation of response.bookings) {
        try {
          const result = await syncReservationFromSmoobu(reservation);
          if (result.action === "created") stats.pulled++;
          else if (result.action === "updated") stats.updated++;
          else stats.skipped++;
        } catch (err) {
          console.error(`Sync error for reservation ${reservation.id}:`, err);
          stats.errors++;
        }
      }

      page++;
    }

    // ── 2. Retry failed pushes ──

    const { data: failedPushes } = await supabase
      .from("bookings")
      .select("id")
      .eq("smoobu_sync_status", "failed")
      .eq("source", "website")
      .in("status", ["confirmed"])
      .limit(10);

    if (failedPushes) {
      for (const booking of failedPushes) {
        try {
          const success = await pushBookingToSmoobu(booking.id);
          if (success) stats.retried++;
        } catch {
          // Already logged in pushBookingToSmoobu
        }
      }
    }

    // ── 3. Update last_sync_at ──

    await supabase
      .from("site_settings")
      .update({
        value: {
          ...(await getSmoobuConfig()),
          last_sync_at: new Date().toISOString(),
        },
      })
      .eq("key", "smoobu_config");

    return NextResponse.json({
      success: true,
      stats,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Smoobu sync cron error:", err);
    return NextResponse.json(
      { error: "Sync failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Also support POST for manual trigger from admin
export { GET as POST };
