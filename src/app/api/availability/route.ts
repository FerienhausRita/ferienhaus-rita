import { NextRequest, NextResponse } from "next/server";
import { getUnavailableDatesDB } from "@/lib/availability-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apartmentId = searchParams.get("apartmentId");
  const month = searchParams.get("month"); // YYYY-MM format

  if (!apartmentId || !month) {
    return NextResponse.json(
      { error: "apartmentId and month (YYYY-MM) are required" },
      { status: 400 }
    );
  }

  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return NextResponse.json(
      { error: "month must be in YYYY-MM format" },
      { status: 400 }
    );
  }

  const year = parseInt(match[1]);
  const monthNum = parseInt(match[2]);

  if (monthNum < 1 || monthNum > 12) {
    return NextResponse.json(
      { error: "Invalid month" },
      { status: 400 }
    );
  }

  try {
    const unavailableDates = await getUnavailableDatesDB(
      apartmentId,
      year,
      monthNum
    );

    return NextResponse.json({ unavailableDates });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Verfügbarkeit" },
      { status: 500 }
    );
  }
}
