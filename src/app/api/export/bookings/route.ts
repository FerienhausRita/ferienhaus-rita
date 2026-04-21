import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getApartmentNameMap,
  getAllApartmentsWithPricing,
  getTaxConfigFromDB,
} from "@/lib/pricing-data";
import * as XLSX from "xlsx";

/**
 * GET /api/export/bookings
 *
 * Exports all bookings as an XLSX file. Admin-only.
 *
 * The export uses **real Excel formulas** for calculated line items so the
 * accountant / reviewer can see how each number is composed:
 *   Übernachtung      = Preis/Nacht × Nächte
 *   Zuschlag Gäste    = Zusatzgäste × Aufpreis/Nacht × Nächte
 *   Zuschlag Hunde    = Hunde × Hundegebühr/Nacht × Nächte
 *   Ortstaxe          = Erwachsene × Ortstaxe/Person/Nacht × Nächte
 *   Gesamtpreis       = Summe der Positionen − Rabatt
 *
 * Formel-Zellen enthalten zusätzlich den cached `v`-Wert, damit beim
 * Re-Import (SheetJS) die Zahlen korrekt gelesen werden.
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

  // --- Load all bookings + pricing context ---
  const supabase = createServerClient();
  const [{ data: bookings, error }, nameMap, apartments, taxConfig] =
    await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      getApartmentNameMap(),
      getAllApartmentsWithPricing(),
      getTaxConfigFromDB(),
    ]);

  if (error) {
    return NextResponse.json(
      { error: "Fehler beim Laden der Buchungen" },
      { status: 500 }
    );
  }

  const aptMap = new Map(apartments.map((a) => [a.id, a]));
  const fallbackTaxRate = Number(taxConfig.localTaxPerNight || 2.5);

  // --- Labels ---
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
    deposit_paid: "Anzahlung bezahlt",
    paid: "Bezahlt",
    refunded: "Erstattet",
  };

  // --- Column definition (order matters!) ---
  const headers = [
    "Buchungs-ID",               // A
    "Wohnung",                   // B
    "Vorname",                   // C
    "Nachname",                  // D
    "E-Mail",                    // E
    "Telefon",                   // F
    "Straße",                    // G
    "PLZ",                       // H
    "Ort",                       // I
    "Land",                      // J
    "Check-in",                  // K
    "Check-out",                 // L
    "Nächte",                    // M
    "Erwachsene",                // N
    "Kinder",                    // O
    "Zusatzgäste",               // P  (= max(0, Erw+Kind − baseGuests))
    "Hunde",                     // Q
    "Preis/Nacht",               // R  (Einheit)
    "Aufpreis Zusatzgast/Nacht", // S  (Einheit)
    "Hundegebühr/Nacht",         // T  (Einheit)
    "Ortstaxe/Person/Nacht",     // U  (Einheit)
    "Übernachtung",              // V  FORMEL = R*M
    "Zuschlag Gäste",            // W  FORMEL = P*S*M
    "Zuschlag Hunde",            // X  FORMEL = Q*T*M
    "Endreinigung",              // Y
    "Ortstaxe",                  // Z  FORMEL = N*U*M
    "Rabatt",                    // AA
    "Rabattcode",                // AB
    "Gesamtpreis",               // AC FORMEL = V+W+X+Y+Z − AA
    "Status",                    // AD
    "Zahlungsstatus",            // AE
    "Rechnungsnummer",           // AF
    "Anmerkungen",               // AG
    "Erstellt am",               // AH
  ];

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Column letters for formula building
  const COL = {
    M: "M",   // Nächte
    N: "N",   // Erwachsene
    P: "P",   // Zusatzgäste
    Q: "Q",   // Hunde
    R: "R",   // Preis/Nacht
    S: "S",   // Aufpreis Zusatzgast/Nacht
    T: "T",   // Hundegebühr/Nacht
    U: "U",   // Ortstaxe/Person/Nacht
    V: "V",   // Übernachtung
    W: "W",   // Zuschlag Gäste
    X: "X",   // Zuschlag Hunde
    Y: "Y",   // Endreinigung
    Z: "Z",   // Ortstaxe
    AA: "AA", // Rabatt
  };

  // Build data rows (plain values – formulas will be overwritten afterwards)
  const dataRows = (bookings || []).map((b) => {
    const apt = aptMap.get(b.apartment_id);
    const baseGuests = apt?.baseGuests ?? 2;
    const nights = Number(b.nights || 0);
    const adults = Number(b.adults || 0);
    const children = Number(b.children || 0);
    const dogs = Number(b.dogs || 0);
    const extraGuestsCount = Math.max(0, adults + children - baseGuests);

    const extraGuestsTotal = Number(b.extra_guests_total || 0);
    const dogsTotal = Number(b.dogs_total || 0);
    const localTaxTotal = Number(b.local_tax_total || 0);
    const totalPrice = Number(b.total_price || 0);
    const cleaningFee = Number(b.cleaning_fee || 0);
    const discountAmount = Number(b.discount_amount || 0);
    const pricePerNight = Number(b.price_per_night || 0);

    // Per-unit rates: derive from stored totals so formulas reproduce them
    // exactly. Fall back to apartment / tax config if no data available.
    const perGuestRate =
      extraGuestsCount > 0 && nights > 0
        ? round2(extraGuestsTotal / (extraGuestsCount * nights))
        : round2(apt?.extraPersonPrice ?? 0);

    const dogRate =
      dogs > 0 && nights > 0
        ? round2(dogsTotal / (dogs * nights))
        : round2(apt?.dogFee ?? 0);

    const localTaxRate =
      adults > 0 && nights > 0
        ? round2(localTaxTotal / (adults * nights))
        : round2(fallbackTaxRate);

    return {
      raw: {
        id: `FR-${b.id.slice(0, 8).toUpperCase()}`,
        apartmentName: nameMap.get(b.apartment_id) || b.apartment_id,
        firstName: b.first_name || "",
        lastName: b.last_name || "",
        email: b.email || "",
        phone: b.phone || "",
        street: b.street || "",
        zip: b.zip || "",
        city: b.city || "",
        country: b.country || "",
        checkIn: b.check_in || "",
        checkOut: b.check_out || "",
        nights,
        adults,
        children,
        extraGuestsCount,
        dogs,
        pricePerNight,
        perGuestRate,
        dogRate,
        localTaxRate,
        cleaningFee,
        discountAmount,
        discountCode: b.discount_code || "",
        status: statusLabels[b.status] || b.status || "",
        paymentStatus:
          paymentLabels[b.payment_status] || b.payment_status || "Offen",
        invoiceNumber: b.invoice_number || "",
        notes: b.notes || "",
        createdAt: b.created_at
          ? new Date(b.created_at).toLocaleDateString("de-AT")
          : "",
      },
      cached: {
        accommodationTotal: round2(pricePerNight * nights),
        extraGuestsTotal: round2(extraGuestsTotal),
        dogsTotal: round2(dogsTotal),
        localTaxTotal: round2(localTaxTotal),
        totalPrice: round2(totalPrice),
      },
    };
  });

  // Build array-of-arrays with header + data values
  const aoa: (string | number | null)[][] = [headers];
  for (const r of dataRows) {
    const { raw, cached } = r;
    aoa.push([
      raw.id,                   // A
      raw.apartmentName,        // B
      raw.firstName,            // C
      raw.lastName,             // D
      raw.email,                // E
      raw.phone,                // F
      raw.street,               // G
      raw.zip,                  // H
      raw.city,                 // I
      raw.country,              // J
      raw.checkIn,              // K
      raw.checkOut,             // L
      raw.nights,               // M
      raw.adults,               // N
      raw.children,             // O
      raw.extraGuestsCount,     // P
      raw.dogs,                 // Q
      raw.pricePerNight,        // R
      raw.perGuestRate,         // S
      raw.dogRate,              // T
      raw.localTaxRate,         // U
      cached.accommodationTotal,// V  (replaced by formula below)
      cached.extraGuestsTotal,  // W
      cached.dogsTotal,         // X
      raw.cleaningFee,          // Y
      cached.localTaxTotal,     // Z  (replaced by formula below)
      raw.discountAmount,       // AA
      raw.discountCode,         // AB
      cached.totalPrice,        // AC (replaced by formula below)
      raw.status,               // AD
      raw.paymentStatus,        // AE
      raw.invoiceNumber,        // AF
      raw.notes,                // AG
      raw.createdAt,            // AH
    ]);
  }

  // Create worksheet from array-of-arrays
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Overwrite formula cells for each data row (row index i in dataRows → Excel row i+2)
  dataRows.forEach((r, i) => {
    const rowIdx = i + 2; // 1-indexed + header

    // V: Übernachtung  = R × M
    ws[`${COL.V}${rowIdx}`] = {
      t: "n",
      f: `${COL.R}${rowIdx}*${COL.M}${rowIdx}`,
      v: r.cached.accommodationTotal,
    };

    // W: Zuschlag Gäste = P × S × M
    ws[`${COL.W}${rowIdx}`] = {
      t: "n",
      f: `${COL.P}${rowIdx}*${COL.S}${rowIdx}*${COL.M}${rowIdx}`,
      v: r.cached.extraGuestsTotal,
    };

    // X: Zuschlag Hunde = Q × T × M
    ws[`${COL.X}${rowIdx}`] = {
      t: "n",
      f: `${COL.Q}${rowIdx}*${COL.T}${rowIdx}*${COL.M}${rowIdx}`,
      v: r.cached.dogsTotal,
    };

    // Z: Ortstaxe = N × U × M
    ws[`${COL.Z}${rowIdx}`] = {
      t: "n",
      f: `${COL.N}${rowIdx}*${COL.U}${rowIdx}*${COL.M}${rowIdx}`,
      v: r.cached.localTaxTotal,
    };

    // AC: Gesamtpreis = V + W + X + Y + Z − AA
    ws[`AC${rowIdx}`] = {
      t: "n",
      f: `${COL.V}${rowIdx}+${COL.W}${rowIdx}+${COL.X}${rowIdx}+${COL.Y}${rowIdx}+${COL.Z}${rowIdx}-${COL.AA}${rowIdx}`,
      v: r.cached.totalPrice,
    };
  });

  // Auto-size columns (base on header + any displayed value as string)
  const rowsForWidth: Record<string, unknown>[] = dataRows.map((r) => ({
    "Buchungs-ID": r.raw.id,
    "Wohnung": r.raw.apartmentName,
    "Vorname": r.raw.firstName,
    "Nachname": r.raw.lastName,
    "E-Mail": r.raw.email,
    "Telefon": r.raw.phone,
    "Straße": r.raw.street,
    "PLZ": r.raw.zip,
    "Ort": r.raw.city,
    "Land": r.raw.country,
    "Check-in": r.raw.checkIn,
    "Check-out": r.raw.checkOut,
    "Nächte": r.raw.nights,
    "Erwachsene": r.raw.adults,
    "Kinder": r.raw.children,
    "Zusatzgäste": r.raw.extraGuestsCount,
    "Hunde": r.raw.dogs,
    "Preis/Nacht": r.raw.pricePerNight,
    "Aufpreis Zusatzgast/Nacht": r.raw.perGuestRate,
    "Hundegebühr/Nacht": r.raw.dogRate,
    "Ortstaxe/Person/Nacht": r.raw.localTaxRate,
    "Übernachtung": r.cached.accommodationTotal,
    "Zuschlag Gäste": r.cached.extraGuestsTotal,
    "Zuschlag Hunde": r.cached.dogsTotal,
    "Endreinigung": r.raw.cleaningFee,
    "Ortstaxe": r.cached.localTaxTotal,
    "Rabatt": r.raw.discountAmount,
    "Rabattcode": r.raw.discountCode,
    "Gesamtpreis": r.cached.totalPrice,
    "Status": r.raw.status,
    "Zahlungsstatus": r.raw.paymentStatus,
    "Rechnungsnummer": r.raw.invoiceNumber,
    "Anmerkungen": r.raw.notes,
    "Erstellt am": r.raw.createdAt,
  }));

  const colWidths = headers.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rowsForWidth.map((r) =>
        String(r[key] ?? "").length
      )
    );
    return { wch: Math.min(maxLen + 2, 36) };
  });
  ws["!cols"] = colWidths;

  // Freeze header row for usability
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Buchungen");

  // --- Sheet 2: Gäste (aggregated, unchanged) ---
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
        ...guestRows.map((r) =>
          String((r as Record<string, unknown>)[key] || "").length
        )
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
