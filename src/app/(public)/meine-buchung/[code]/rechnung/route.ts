import { NextRequest, NextResponse } from "next/server";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import { contact } from "@/data/contact";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

/**
 * GET /meine-buchung/[code]/rechnung
 *
 * Guest-facing invoice PDF download.
 * Authenticates via guest_token cookie, then generates the PDF directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  // --- Auth: verify guest token from cookie ---
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/guest_token=([^;]+)/);
  const tokenValue = match?.[1];

  if (!tokenValue) {
    return NextResponse.redirect(new URL("/meine-buchung", request.url));
  }

  const tokenData = verifyGuestToken(tokenValue);
  if (!tokenData || tokenData.bookingId !== code) {
    return NextResponse.redirect(new URL("/meine-buchung", request.url));
  }

  // --- Load booking ---
  const supabase = createServerClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", code)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: "Buchung nicht gefunden" },
      { status: 404 }
    );
  }

  // --- Assign invoice number if missing ---
  if (!booking.invoice_number) {
    const currentYear = new Date().getFullYear();

    const { data: counterRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "invoice_counter")
      .single();

    let counter = counterRow?.value ?? { year: currentYear, next_number: 1 };

    if (counter.year !== currentYear) {
      counter = { year: currentYear, next_number: 1 };
    }

    const nextNumber = counter.next_number;
    const invoiceNumber = `FR-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    const { error: updateBookingError } = await supabase
      .from("bookings")
      .update({ invoice_number: invoiceNumber })
      .eq("id", code);

    if (updateBookingError) {
      console.error("Error saving invoice number:", updateBookingError);
      return NextResponse.json(
        { error: "Rechnungsnummer konnte nicht gespeichert werden" },
        { status: 500 }
      );
    }

    const { error: updateCounterError } = await supabase
      .from("site_settings")
      .upsert({
        key: "invoice_counter",
        value: { year: currentYear, next_number: nextNumber + 1 },
        updated_at: new Date().toISOString(),
      });

    if (updateCounterError) {
      console.error("Error updating invoice counter:", updateCounterError);
    }

    booking.invoice_number = invoiceNumber;
  }

  // --- Load apartment ---
  const apartment = getApartmentById(booking.apartment_id);
  if (!apartment) {
    return NextResponse.json(
      { error: "Wohnung nicht gefunden" },
      { status: 404 }
    );
  }

  // --- Load bank details ---
  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .single();

  const bankDetails = bankRow?.value ?? {};

  // --- Generate PDF ---
  try {
    const pdfBuffer = await generateInvoicePdf({
      booking,
      apartment,
      bankDetails,
      contact,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Rechnung-${booking.invoice_number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    return NextResponse.json(
      { error: "PDF-Erstellung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
