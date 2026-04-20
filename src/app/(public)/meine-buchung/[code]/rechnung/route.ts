import { NextResponse } from "next/server";

/**
 * GET /meine-buchung/[code]/rechnung
 *
 * DEACTIVATED:
 * Invoice download is no longer available in the guest portal.
 * The invoice is sent via email after booking confirmation.
 *
 * Admins can still download via /api/invoice/[bookingId].
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Rechnungsdownload im Gästeportal deaktiviert. Die Rechnung erhalten Sie per E-Mail.",
    },
    { status: 403 }
  );
}
