import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { sendBookingsExportEmail } from "@/lib/send-bookings-export-email";

/**
 * Daily bookings export — sends the generated XLSX to the configured
 * recipient address. Runs on Vercel Cron. Manual "Testversand" from the
 * admin panel is handled via the `sendBookingsExportEmailNow` server
 * action, which calls the helper directly (no HTTP hop).
 */

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (vercelCron) return true;
  if (
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return true;
  }
  if (
    authHeader &&
    authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return true;
  }
  try {
    const authSupabase = createAuthServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (user) {
      const { data: profile } = await authSupabase
        .from("admin_profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (profile) return true;
    }
  } catch {
    // fallthrough
  }
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

async function run(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipientOverride = request.nextUrl.searchParams.get("to") ?? undefined;

  const result = await sendBookingsExportEmail({
    recipientOverride: recipientOverride || undefined,
    // A manual ?to=... call from an admin is treated as a test send and
    // ignores the enabled-flag. Pure cron hits don't include `to`.
    ignoreEnabled: !!recipientOverride,
  });

  if (!result.success) {
    if (result.skipped) {
      return NextResponse.json({ skipped: true, reason: result.skipped });
    }
    return NextResponse.json(
      { error: result.error ?? "Unbekannter Fehler" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    sentTo: result.sentTo,
    bookingCount: result.bookingCount,
    guestCount: result.guestCount,
    fileSize: result.fileSize,
  });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
