import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentNameMap } from "@/lib/pricing-data";
import * as XLSX from "xlsx";

/**
 * GET /api/export/bookings
 *
 * Exports all bookings as an XLSX file. Admin-only.
 */
export async function GET() {
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

  // --- Load all bookings ---
  const supabase = createServerClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Fehler beim Laden der Buchungen" },
      { status: 500 }
    );
  }

  // --- Build Excel data ---
  const statusLabels: Record<string, string> = {
    pending: "Anfrage",
    confirmed: "Bestätigt",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
  };

  const paymentLabels: Record<string, string> = {
    unpaid: "Offen",
    pending: "Offen",
    partial: "Teilweise bezahlt",
    paid: "Bezahlt",
    refunded: "Erstattet",
  };

  const nameMap = await getApartmentNameMap();

  const rows = (bookings || []).map((b) => {
    return {
      "Buchungs-ID": `FR-${b.id.slice(0, 8).toUpperCase()}`,
      Wohnung: nameMap.get(b.apartment_id) || b.apartment_id,
      Vorname: b.first_name,
      Nachname: b.last_name,
      "E-Mail": b.email,
      Telefon: b.phone || "",
      Straße: b.street || "",
      PLZ: b.zip || "",
      Ort: b.city || "",
      Land: b.country || "",
      "Check-in": b.check_in,
      "Check-out": b.check_out,
      Nächte: b.nights,
      Erwachsene: b.adults,
      Kinder: b.children,
      Hunde: b.dogs,
      "Preis/Nacht": Number(b.price_per_night || 0),
      "Zuschlag Gäste": Number(b.extra_guests_total || 0),
      "Zuschlag Hunde": Number(b.dogs_total || 0),
      Endreinigung: Number(b.cleaning_fee || 0),
      Ortstaxe: Number(b.local_tax_total || 0),
      Rabatt: Number(b.discount_amount || 0),
      "Rabattcode": b.discount_code || "",
      Gesamtpreis: Number(b.total_price || 0),
      Status: statusLabels[b.status] || b.status,
      Zahlungsstatus: paymentLabels[b.payment_status] || b.payment_status || "Offen",
      Rechnungsnummer: b.invoice_number || "",
      Anmerkungen: b.notes || "",
      "Erstellt am": b.created_at
        ? new Date(b.created_at).toLocaleDateString("de-AT")
        : "",
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Buchungen
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String((r as Record<string, unknown>)[key] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Buchungen");

  // Sheet 2: Gäste (aggregiert)
  const guestMap = new Map<
    string,
    { name: string; email: string; phone: string; bookings: number; revenue: number }
  >();

  for (const b of bookings || []) {
    if (b.status === "cancelled") continue;
    const key = b.email?.toLowerCase();
    if (!key) continue;
    const existing = guestMap.get(key);
    if (existing) {
      existing.bookings += 1;
      existing.revenue += Number(b.total_price || 0);
    } else {
      guestMap.set(key, {
        name: `${b.first_name} ${b.last_name}`,
        email: b.email,
        phone: b.phone || "",
        bookings: 1,
        revenue: Number(b.total_price || 0),
      });
    }
  }

  const guestRows = Array.from(guestMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((g) => ({
      Name: g.name,
      "E-Mail": g.email,
      Telefon: g.phone,
      "Anzahl Buchungen": g.bookings,
      "Gesamtumsatz": g.revenue,
    }));

  if (guestRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(guestRows);
    const colWidths2 = Object.keys(guestRows[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...guestRows.map((r) => String((r as Record<string, unknown>)[key] || "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws2["!cols"] = colWidths2;
    XLSX.utils.book_append_sheet(wb, ws2, "Gäste");
  }

  // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Ferienhaus-Rita-Export-${today}.xlsx"`,
    },
  });
}
