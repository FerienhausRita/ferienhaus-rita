import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createGuestToken } from "@/lib/guest-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, lastName } = body as { code?: string; lastName?: string };

    if (!code || !lastName) {
      return NextResponse.json(
        { error: "Buchungscode und Nachname sind erforderlich" },
        { status: 400 }
      );
    }

    // Sanitize: strip "FR-" prefix if present, then take max 8 hex-like chars
    let sanitizedCode = code.trim().toLowerCase();
    sanitizedCode = sanitizedCode.replace(/^fr-/i, "").slice(0, 8);
    const sanitizedLastName = lastName.trim();

    if (sanitizedCode.length < 4) {
      return NextResponse.json(
        { error: "Ungültiger Buchungscode" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Rate-Limiting: max. Versuche pro IP im Zeitfenster (gegen Brute-Force des
    // 8-Hex-Codes). Zählt über alle Serverless-Instanzen (Supabase = shared state).
    // Fail-open: Fehler beim Rate-Limit-Check dürfen den Login NICHT blockieren.
    const RL_WINDOW_MIN = 15;
    const RL_MAX_ATTEMPTS = 10;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    try {
      const since = new Date(Date.now() - RL_WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabase
        .from("login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= RL_MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "Zu viele Versuche. Bitte in einigen Minuten erneut versuchen." },
          { status: 429 }
        );
      }
      // Versuch protokollieren + alte Einträge (außerhalb des Fensters) aufräumen.
      await supabase.from("login_attempts").insert({ ip });
      await supabase.from("login_attempts").delete().lt("created_at", since);
    } catch (rlErr) {
      console.error("Rate-Limit-Check fehlgeschlagen (fail-open):", rlErr);
    }

    // Query bookings by last_name (case-insensitive), then filter by code prefix client-side.
    // This avoids LIKE on UUID columns which PostgREST doesn't support well.
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, last_name")
      .ilike("last_name", sanitizedLastName)
      .limit(50);

    if (error) {
      console.error("Guest auth DB error:", error);
      return NextResponse.json(
        { error: "Serverfehler" },
        { status: 500 }
      );
    }

    // Find a booking where the ID starts with the provided code
    const booking = bookings?.find((b) =>
      b.id.toLowerCase().startsWith(sanitizedCode)
    );

    if (!booking) {
      return NextResponse.json(
        { error: "Ungültiger Code oder Name" },
        { status: 401 }
      );
    }

    // Create signed token
    const token = createGuestToken(booking.id, booking.last_name);

    // Build response with cookie
    const response = NextResponse.json({
      success: true,
      bookingId: booking.id,
    });

    response.cookies.set("guest_token", token, {
      httpOnly: true,
      maxAge: 86400, // 24 hours
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Guest auth error:", err);
    return NextResponse.json(
      { error: "Serverfehler" },
      { status: 500 }
    );
  }
}
