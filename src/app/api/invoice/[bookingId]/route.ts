import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentWithPricing } from "@/lib/pricing-data";
import { contact } from "@/data/contact";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { normalizeBankDetails } from "@/lib/bank-details";
import { verifyGuestToken } from "@/lib/guest-auth";

/**
 * GET /api/invoice/[bookingId]
 *
 * Generates and returns an invoice PDF for the given booking.
 * Automatically assigns an invoice number if the booking doesn't have one yet.
 *
 * Auth: Admin (via admin_profiles check) OR guest (via guest_token cookie).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;

  // --- Auth: try admin first, then guest token ---
  let isAuthorized = false;

  // Admin path
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

      if (profile) {
        isAuthorized = true;
      }
    }
  } catch {
    // Admin auth failed, try guest path
  }

  // Guest path
  if (!isAuthorized) {
    const cookieHeader = _request.headers.get("cookie") || "";
    const match = cookieHeader.match(/guest_token=([^;]+)/);
    const tokenValue = match?.[1];

    if (tokenValue) {
      const tokenData = verifyGuestToken(tokenValue);
      if (tokenData && tokenData.bookingId === bookingId) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // --- Load booking ---
  const supabase = createServerClient();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }

  // --- Assign invoice number if missing ---
  if (!booking.invoice_number) {
    const currentYear = new Date().getFullYear();

    // Read current counter
    const { data: counterRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "invoice_counter")
      .single();

    let counter = counterRow?.value ?? { year: currentYear, next_number: 1 };

    // Reset if year changed
    if (counter.year !== currentYear) {
      counter = { year: currentYear, next_number: 1 };
    }

    const nextNumber = counter.next_number;
    const invoiceNumber = `FR-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    // Save invoice number to booking
    const { error: updateBookingError } = await supabase
      .from("bookings")
      .update({ invoice_number: invoiceNumber })
      .eq("id", bookingId);

    if (updateBookingError) {
      console.error("Error saving invoice number:", updateBookingError);
      return NextResponse.json(
        { error: "Rechnungsnummer konnte nicht gespeichert werden" },
        { status: 500 }
      );
    }

    // Increment counter
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
  const apartment = await getApartmentWithPricing(booking.apartment_id);
  if (!apartment) {
    return NextResponse.json({ error: "Wohnung nicht gefunden" }, { status: 404 });
  }

  // --- Load bank details from site_settings ---
  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .single();

  const bankDetails = normalizeBankDetails(
    bankRow?.value as Record<string, unknown> | null | undefined
  ) ?? { iban: "", bic: "", account_holder: "", bank_name: "" };

  // --- Snapshot laden (wenn vorhanden) ---
  // Wenn Buchung schon einen Snapshot hat → daraus rendern (eingefrorene
  // Rechnung). Sonst Live-Berechnung wie bisher (Legacy / nicht finalisierte
  // Buchungen).
  type WithSnapshot = { invoice_snapshot?: unknown };
  const snapshot =
    ((booking as WithSnapshot).invoice_snapshot as
      | import("@/lib/invoice-snapshot").InvoiceSnapshot
      | null
      | undefined) ?? null;

  // --- Zahlungen live aus DB laden (nicht Teil des Snapshots) ---
  const { data: paymentsRaw } = await supabase
    .from("booking_payments")
    .select("id, amount, paid_at, applies_to, method, note")
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: true });
  const payments = (paymentsRaw ?? []).map((p) => ({
    id: p.id as string,
    amount: Number(p.amount),
    paid_at: p.paid_at as string,
    applies_to: p.applies_to as string,
    method: (p.method as string) ?? null,
    note: (p.note as string) ?? null,
  }));

  // --- Generate PDF ---
  try {
    const pdfBuffer = await generateInvoicePdf({
      booking,
      apartment,
      bankDetails,
      contact,
      snapshot,
      payments,
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
