import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import { generateMeldescheinPdf } from "@/lib/meldeschein-pdf";

/**
 * GET /api/meldeschein/[bookingId]/pdf
 *
 * Downloads the Meldeschein as a PDF. Admin-only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  // --- Auth: admin only ---
  const authSupabase = createAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await authSupabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Load data ---
  const supabase = createServerClient();

  const { data: meldeschein, error: msError } = await supabase
    .from("meldeschein")
    .select("*")
    .eq("booking_id", params.bookingId)
    .single();

  if (msError || !meldeschein) {
    return NextResponse.json(
      { error: "Meldeschein nicht gefunden" },
      { status: 404 }
    );
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, apartment_id, check_in, check_out, first_name, last_name")
    .eq("id", params.bookingId)
    .single();

  if (!booking) {
    return NextResponse.json(
      { error: "Buchung nicht gefunden" },
      { status: 404 }
    );
  }

  const apartment = getApartmentById(booking.apartment_id);
  const bookingRef = `FR-${booking.id.substring(0, 8).toUpperCase()}`;

  // --- Generate PDF ---
  const buf = await generateMeldescheinPdf({
    first_name: meldeschein.first_name,
    last_name: meldeschein.last_name,
    date_of_birth: meldeschein.date_of_birth,
    nationality: meldeschein.nationality,
    id_type: meldeschein.id_type,
    id_number: meldeschein.id_number,
    street: meldeschein.street,
    zip: meldeschein.zip,
    city: meldeschein.city,
    country: meldeschein.country,
    companions: (meldeschein.companions || []) as {
      first_name: string;
      last_name: string;
      date_of_birth: string;
      nationality: string;
    }[],
    arrival_date: meldeschein.arrival_date,
    departure_date: meldeschein.departure_date,
    apartment_name: apartment?.name || booking.apartment_id,
    booking_ref: bookingRef,
  });

  const fileName = `Meldeschein-${meldeschein.last_name}-${bookingRef}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
