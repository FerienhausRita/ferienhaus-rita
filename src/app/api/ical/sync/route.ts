import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseICal } from "@/lib/ical";
import { icalFeeds } from "@/data/ical-feeds";

/**
 * GET & POST /api/ical/sync
 *
 * Fetches all configured external iCal feeds (Smoobu, Airbnb, Booking.com)
 * and syncs blocked dates into the database.
 *
 * Called every 15 minutes via Vercel Cron (GET with CRON_SECRET).
 * Can also be called manually via POST with service role key.
 */

function verifyAuth(request: NextRequest): boolean {
  // Vercel Cron sends this header automatically
  const cronSecret = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  // Allow Vercel Cron jobs (they set CRON_SECRET or x-vercel-cron header)
  if (process.env.CRON_SECRET) {
    if (cronSecret === `Bearer ${process.env.CRON_SECRET}`) return true;
  }

  // Allow if Vercel Cron header is present (set automatically by Vercel)
  if (vercelCron) return true;

  // Allow with service role key (for manual calls)
  if (
    cronSecret &&
    cronSecret === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return true;
  }

  // Allow in development
  if (process.env.NODE_ENV === "development") return true;

  return false;
}

async function runSync() {
  const supabase = createServerClient();
  const results: Record<
    string,
    { imported: number; deleted: number; error?: string }
  > = {};

  for (const [apartmentId, feedUrls] of Object.entries(icalFeeds)) {
    if (!feedUrls || feedUrls.length === 0) {
      results[apartmentId] = { imported: 0, deleted: 0 };
      continue;
    }

    try {
      const allEvents: { start: string; end: string; summary: string; description: string }[] = [];

      for (const url of feedUrls) {
        try {
          const response = await fetch(url, {
            headers: { "User-Agent": "FerienhausRita/1.0" },
          });
          if (!response.ok) {
            console.error(
              `Failed to fetch iCal feed for ${apartmentId}: ${url} (${response.status})`
            );
            continue;
          }
          const text = await response.text();
          const events = parseICal(text);
          allEvents.push(...events);
        } catch (fetchError) {
          console.error(
            `Error fetching iCal feed ${url} for ${apartmentId}:`,
            fetchError
          );
        }
      }

      // Delete old synced blocked dates for this apartment
      const { data: deleted } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("apartment_id", apartmentId)
        .like("reason", "iCal:%")
        .select("id");

      // Insert new blocked dates from feeds
      const today = new Date().toISOString().split("T")[0];
      const futureEvents = allEvents.filter((e) => e.end > today);

      if (futureEvents.length > 0) {
        const { error: insertError } = await supabase
          .from("blocked_dates")
          .insert(
            futureEvents.map((e) => {
              // Build a descriptive reason: prefer description (has guest info) over summary
              let reason = `iCal: ${e.summary}`;
              if (e.description) {
                reason = `iCal: ${e.summary} – ${e.description}`;
              }
              // Truncate to avoid DB issues (max ~500 chars)
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
        imported: futureEvents.length,
        deleted: deleted?.length ?? 0,
      };
    } catch (error) {
      results[apartmentId] = {
        imported: 0,
        deleted: 0,
        error: String(error),
      };
    }
  }

  return results;
}

// GET – called by Vercel Cron
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Debug mode: ?debug=true shows raw feed data without syncing
  const debug = request.nextUrl.searchParams.get("debug") === "true";

  if (debug) {
    const debugResults: Record<string, unknown> = {};
    for (const [apartmentId, feedUrls] of Object.entries(icalFeeds)) {
      for (const url of feedUrls) {
        try {
          const response = await fetch(url, {
            headers: { "User-Agent": "FerienhausRita/1.0" },
          });
          const text = await response.text();
          const events = parseICal(text);
          debugResults[apartmentId] = {
            feedUrl: url.replace(/\?.*/, "?s=***"),
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
          debugResults[apartmentId] = { error: String(err) };
        }
      }
    }
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

// POST – for manual sync calls
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runSync();
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
