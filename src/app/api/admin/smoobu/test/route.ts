import { NextResponse } from "next/server";
import { createSmoobuClient } from "@/lib/smoobu/client";
import { getSmoobuConfig } from "@/lib/smoobu/mapping";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = createSmoobuClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: "SMOOBU_API_KEY nicht konfiguriert",
      });
    }

    const apartments = await client.getApartments();
    const config = await getSmoobuConfig();

    // Check which local apartments are mapped
    const mapped = Object.entries(config.apartment_mapping).map(
      ([slug, smoobuId]) => {
        const found = apartments.find((a) => a.id === smoobuId);
        return {
          slug,
          smoobuId,
          name: found?.name ?? "Nicht gefunden",
          matched: !!found,
        };
      },
    );

    return NextResponse.json({
      success: true,
      apartments: mapped,
      totalSmoobuApartments: apartments.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ success: false, error: message });
  }
}
