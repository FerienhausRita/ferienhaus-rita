import { NextRequest, NextResponse } from "next/server";
import { syncReservationFromSmoobu } from "@/lib/smoobu/sync";
import { isSmoobuEnabled } from "@/lib/smoobu/mapping";
import type { SmoobuReservation } from "@/lib/smoobu/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const enabled = await isSmoobuEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "Smoobu integration disabled" }, { status: 503 });
  }

  try {
    const payload = await request.json();

    // Smoobu webhook payload contains the reservation data directly
    const reservation = payload as SmoobuReservation;

    if (!reservation.id || !reservation.apartment?.id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await syncReservationFromSmoobu(reservation);

    return NextResponse.json({
      success: true,
      action: result.action,
      bookingId: result.bookingId || null,
    });
  } catch (err) {
    console.error("Smoobu webhook error:", err);
    return NextResponse.json(
      { error: "Internal error processing webhook" },
      { status: 500 },
    );
  }
}
