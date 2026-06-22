import { NextRequest, NextResponse } from "next/server";
import { findAlternativeRanges } from "@/lib/availability-server";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = parseInt(searchParams.get("guests") || "1", 10);

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: "checkIn und checkOut erforderlich" },
      { status: 400 }
    );
  }

  const nights = Math.round(
    (Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) /
      86400000
  );
  if (!Number.isFinite(nights) || nights < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const apartments = await getAllApartmentsWithPricing();
    // Nur Wohnungen, die zu den Kriterien passen (buchbar + genug Plätze).
    const matching = apartments.filter(
      (a) => a.available && a.maxGuests >= guests
    );
    const nameById = new Map(matching.map((a) => [a.id, a.name]));

    const raw = await findAlternativeRanges({
      apartmentIds: matching.map((a) => a.id),
      desiredCheckIn: checkIn,
      nights,
    });

    const suggestions = raw.map((s) => ({
      ...s,
      apartmentName: nameById.get(s.apartmentId) ?? s.apartmentId,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json(
      { error: "Fehler beim Suchen von Alternativterminen" },
      { status: 500 }
    );
  }
}
