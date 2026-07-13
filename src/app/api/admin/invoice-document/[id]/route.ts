import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentWithPricing } from "@/lib/pricing-data";
import { contact } from "@/data/contact";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { normalizeBankDetails } from "@/lib/bank-details";
import type { InvoiceSnapshot } from "@/lib/invoice-snapshot";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invoice-document/[id]
 * Liefert das PDF einer Stornorechnung oder Rechnungskorrektur.
 * Auth: Admin. Gerendert aus dem eingefrorenen Dokument-Snapshot.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await auth.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServerClient();
  const { data: doc, error } = await supabase
    .from("invoice_documents")
    .select("id, booking_id, type, number, snapshot, related_invoice_number, related_invoice_date, reason")
    .eq("id", params.id)
    .single();
  if (error || !doc) return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });

  const snapshot = doc.snapshot as InvoiceSnapshot;

  // Buchung für E-Mail/Telefon (Adresse/Aufenthalt kommen aus dem Snapshot).
  const { data: bk } = await supabase
    .from("bookings")
    .select("id, email, phone")
    .eq("id", doc.booking_id)
    .single();

  const apartment = await getApartmentWithPricing(snapshot.apartment.id);
  if (!apartment) return NextResponse.json({ error: "Wohnung nicht gefunden" }, { status: 404 });

  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .maybeSingle();
  const bankDetails = normalizeBankDetails(
    bankRow?.value as Record<string, unknown> | null | undefined
  ) ?? { iban: "", bic: "", account_holder: "", bank_name: "" };

  // Buchungsobjekt für das PDF aus dem (eingefrorenen) Snapshot bauen.
  const booking = {
    id: doc.booking_id as string,
    apartment_id: snapshot.apartment.id,
    check_in: snapshot.stay.check_in,
    check_out: snapshot.stay.check_out,
    first_name: snapshot.guest.first_name,
    last_name: snapshot.guest.last_name,
    email: (bk?.email as string) ?? "",
    phone: (bk?.phone as string) ?? null,
    street: snapshot.guest.street ?? "",
    zip: snapshot.guest.zip ?? "",
    city: snapshot.guest.city ?? "",
    country: snapshot.guest.country ?? "",
    company: snapshot.guest.company ?? null,
    vat_id: snapshot.guest.vat_id ?? null,
    adults: snapshot.stay.adults,
    children: snapshot.stay.children,
    infants: snapshot.stay.infants,
    dogs: snapshot.stay.dogs,
    total_price: snapshot.totals.total,
    invoice_number: doc.number as string,
    notes: null,
  };

  try {
    const pdfBuffer = await generateInvoicePdf({
      booking,
      apartment,
      bankDetails,
      contact,
      snapshot,
      documentType: doc.type as "storno" | "correction",
      relatedInvoice: {
        number: doc.related_invoice_number as string,
        date: (doc.related_invoice_date as string) ?? null,
      },
      reason: (doc.reason as string) ?? null,
    });

    const label = doc.type === "storno" ? "Stornorechnung" : "Rechnungskorrektur";
    const inline = new URL(_request.url).searchParams.get("inline") === "1";
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${label}-${doc.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Error generating invoice document PDF:", err);
    return NextResponse.json({ error: "PDF-Erstellung fehlgeschlagen" }, { status: 500 });
  }
}
