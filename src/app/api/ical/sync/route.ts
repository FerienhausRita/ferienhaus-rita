import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { parseICal } from "@/lib/ical";

/**
 * GET & POST /api/ical/sync
 *
 * Fetches all active external iCal feeds (Smoobu, Airbnb, Booking.com, ...)
 * from the `ical_import_feeds` table and syncs blocked dates into the database.
 *
 * Called daily via Vercel Cron (GET with CRON_SECRET).
 * Can also be called manually via POST with service role key or admin session.
 *
 * Per-feed sync metadata (last_synced_at, last_sync_status, last_sync_error,
 * last_sync_event_count) is written back to ical_import_feeds after each run.
 */

interface FeedRow {
  id: string;
  apartment_id: string;
  url: string;
  label: string | null;
  active: boolean;
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const cronSecret = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (process.env.CRON_SECRET) {
    if (cronSecret === `Bearer ${process.env.CRON_SECRET}`) return true;
  }
  if (vercelCron) return true;
  if (
    cronSecret &&
    cronSecret === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return true;
  }
  try {
    const authSupabase = createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (user) {
      const { data: profile } = await authSupabase
        .from("admin_profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (profile) return true;
    }
  } catch {
    // Session check failed
  }
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

async function loadActiveFeeds(
  supabase: ReturnType<typeof createServerClient>
): Promise<FeedRow[]> {
  const { data, error } = await supabase
    .from("ical_import_feeds")
    .select("id, apartment_id, url, label, active")
    .eq("active", true);
  if (error) {
    console.error("Failed to load active ical feeds:", error);
    return [];
  }
  return (data ?? []) as FeedRow[];
}

async function runSync() {
  const supabase = createServerClient();
  const results: Record<
    string,
    { imported: number; deleted: number; skipped_bookings?: number; error?: string }
  > = {};

  const feeds = await loadActiveFeeds(supabase);

  // Group feeds by apartment
  const byApartment = new Map<string, FeedRow[]>();
  for (const f of feeds) {
    const list = byApartment.get(f.apartment_id) ?? [];
    list.push(f);
    byApartment.set(f.apartment_id, list);
  }

  for (const [apartmentId, apartmentFeeds] of byApartment) {
    try {
      const allEvents: {
        start: string;
        end: string;
        summary: string;
        description: string;
      }[] = [];

      // Fetch each feed individually and record per-feed status
      for (const feed of apartmentFeeds) {
        let status: "ok" | "error" = "ok";
        let errorMsg: string | null = null;
        let eventCount = 0;

        try {
          const response = await fetch(feed.url, {
            headers: { "User-Agent": "FerienhausRita/1.0" },
          });
          if (!response.ok) {
            status = "error";
            errorMsg = `HTTP ${response.status}`;
          } else {
            const text = await response.text();
            const events = parseICal(text);
            eventCount = events.length;
            allEvents.push(...events);
          }
        } catch (err) {
          status = "error";
          errorMsg = err instanceof Error ? err.message : String(err);
        }

        await supabase
          .from("ical_import_feeds")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: status,
            last_sync_error: errorMsg,
            last_sync_event_count: eventCount,
          })
          .eq("id", feed.id);
      }

      // Delete old synced blocked dates for this apartment
      const { data: deleted } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("apartment_id", apartmentId)
        .like("reason", "iCal:%")
        .select("id");

      // Skip past events and events that overlap bookings
      const today = new Date().toISOString().split("T")[0];
      const futureEvents = allEvents.filter((e) => e.end > today);

      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("check_in, check_out")
        .eq("apartment_id", apartmentId)
        .neq("status", "cancelled")
        .gte("check_out", today);

      const bookingsList = existingBookings ?? [];

      const filteredEvents = futureEvents.filter((e) => {
        return !bookingsList.some(
          (b) => b.check_in < e.end && b.check_out > e.start
        );
      });

      if (filteredEvents.length > 0) {
        const { error: insertError } = await supabase
          .from("blocked_dates")
          .insert(
            filteredEvents.map((e) => {
              let reason = `iCal: ${e.summary}`;
              if (e.description) {
                reason = `iCal: ${e.summary} – ${e.description}`;
              }
              if (reason.length > 500) reason = reason.slice(0, 497) + "...";
              return {
                apartment_id: apartmentId,
                start_date: e.start,
                end_date: e.end,
                reason,
              };
            })
          );

        if (insertError) {
          results[apartmentId] = {
            imported: 0,
            deleted: deleted?.length ?? 0,
            error: insertError.message,
          };
          continue;
        }
      }

      results[apartmentId] = {
        imported: filteredEvents.length,
        deleted: deleted?.length ?? 0,
        skipped_bookings: futureEvents.length - filteredEvents.length,
      };
    } catch (error) {
      results[apartmentId] = {
        imported: 0,
        deleted: 0,
        error: String(error),
      };
    }
  }

  // Also ensure apartments with NO active feeds still get their old iCal blocks cleared
  // (i.e., user deactivated/deleted all feeds for a unit → blocks should vanish).
  const { data: allApts } = await supabase
    .from("ical_import_feeds")
    .select("apartment_id");
  const apartmentsWithFeeds = new Set(
    (allApts ?? []).map((r) => r.apartment_id)
  );
  const apartmentsWithActive = new Set(byApartment.keys());
  const orphans = Array.from(apartmentsWithFeeds).filter(
    (id) => !apartmentsWithActive.has(id)
  );
  for (const apartmentId of orphans) {
    const { data: deleted } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("apartment_id", apartmentId)
      .like("reason", "iCal:%")
      .select("id");
    results[apartmentId] = {
      imported: 0,
      deleted: deleted?.length ?? 0,
    };
  }

  return results;
}

async function runDebug(): Promise<Record<string, unknown>> {
  const supabase = createServerClient();
  const feeds = await loadActiveFeeds(supabase);
  const out: Record<string, unknown> = {};

  for (const feed of feeds) {
    const key = `${feed.apartment_id} – ${feed.label ?? "Extern"}`;
    try {
      const response = await fetch(feed.url, {
        headers: { "User-Agent": "FerienhausRita/1.0" },
      });
      const text = await response.text();
      const events = parseICal(text);
      out[key] = {
        feedUrl: feed.url.replace(/\?.*/, "?s=***"),
        status: response.status,
        eventCount: events.length,
        events: events.map((e) => ({
          start: e.start,
          end: e.end,
          summary: e.summary,
          description: e.description || "(leer)",
        })),
        rawLength: text.length,
      };
    } catch (err) {
      out[key] = { error: String(err) };
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debug = request.nextUrl.searchParams.get("debug") === "true";
  if (debug) {
    const debugResults = await runDebug();
    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      results: debugResults,
    });
  }

  const results = await runSync();
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runSync();
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
