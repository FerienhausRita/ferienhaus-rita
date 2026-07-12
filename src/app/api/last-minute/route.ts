import { NextResponse } from "next/server";
import { getLastMinuteOffers } from "@/lib/last-minute";

export const dynamic = "force-dynamic";

/**
 * GET /api/last-minute
 * Öffentliche, DB-getriebene Last-Minute-Angebote für das Startseiten-Pop-up.
 * Liefert nur Wohnungen, die innerhalb der konfigurierten Schwelle frei sind.
 */
export async function GET() {
  try {
    const data = await getLastMinuteOffers();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (err) {
    console.error("last-minute offers error:", err);
    return NextResponse.json(
      { enabled: false, discountPercent: 0, daysThreshold: 0, offers: [] },
      { status: 200 }
    );
  }
}
