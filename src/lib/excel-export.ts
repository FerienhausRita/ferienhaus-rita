/**
 * Shared helper: generate the Buchungen XLSX workbook as a Node Buffer.
 *
 * Used by:
 *   - /api/export/bookings (admin download button)
 *   - /api/cron/export-bookings (daily email attachment)
 *
 * Produces a formula-driven spreadsheet where calculated positions
 * (Übernachtung, Zuschlag Gäste, Zuschlag Hunde, Ortstaxe, Gesamtpreis)
 * are real Excel formulas referencing unit-price columns. Euro cells are
 * formatted with the display format "#,##0.00 €".
 */

import * as XLSX from "xlsx";
import { createServerClient } from "@/lib/supabase/server";
import {
  getApartmentNameMap,
  getAllApartmentsWithPricing,
  getTaxConfigFromDB,
} from "@/lib/pricing-data";

export interface XlsxExportResult {
  buffer: Buffer;
  bookingCount: number;
  guestCount: number;
}

export async function generateBookingsXlsx(): Promise<XlsxExportResult> {
  const supabase = createServerClient();

  const [{ data: bookings }, nameMap, apartments, taxConfig] = await Promise.all([
    supabase.from("bookings").select("*").order("created_at", { ascending: false }),
    getApartmentNameMap(),
    getAllApartmentsWithPricing(),
    getTaxConfigFromDB(),
  ]);

  const aptMap = new Map(apartments.map((a) => [a.id, a]));
  const fallbackTaxRate = Number(taxConfig.localTaxPerNight || 2.5);

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

  const headers = [
    "Buchungs-ID",                // A
    "Wohnung",                    // B
    "Vorname",                    // C
    "Nachname",                   // D
    "Gesamtpreis",                // E  FORMEL
    "Status",                     // F
    "Zahlungsstatus",             // G
    "Check-in",                   // H
    "Check-out",                  // I
    "Nächte",                     // J
    "Erwachsene",                 // K
    "Kinder",                     // L
    "Zusatzgäste",                // M
    "Hunde",                      // N
    "Preis/Nacht",                // O
    "Aufpreis Zusatzgast/Nacht",  // P
    "Hundegebühr/Nacht",          // Q
    "Ortstaxe/Person/Nacht",      // R
    "Übernachtung",               // S  FORMEL
    "Zuschlag Gäste",             // T  FORMEL
    "Zuschlag Hunde",             // U  FORMEL
    "Endreinigung",               // V
    "Ortstaxe",                   // W  FORMEL
    "Rabatt",                     // X
    "Rabattcode",                 // Y
    "E-Mail",                     // Z
    "Telefon",                    // AA
    "Straße",                     // AB
    "PLZ",                        // AC
    "Ort",                        // AD
    "Land",                       // AE
    "Rechnungsnummer",            // AF
    "Anmerkungen",                // AG
    "Erstellt am",                // AH
  ];

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const EUR_FMT = '#,##0.00" €"';

  const COL = {
    E: "E",  J: "J",  K: "K",  M: "M",  N: "N",
    O: "O",  P: "P",  Q: "Q",  R: "R",
    S: "S",  T: "T",  U: "U",  V: "V",
    W: "W",  X: "X",
  };

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
        paymentStatus: paymentLabels[b.payment_status] || b.payment_status || "Offen",
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

  const aoa: (string | number | null)[][] = [headers];
  for (const r of dataRows) {
    const { raw, cached } = r;
    aoa.push([
      raw.id,
      raw.apartmentName,
      raw.firstName,
      raw.lastName,
      cached.totalPrice,
      raw.status,
      raw.paymentStatus,
      raw.checkIn,
      raw.checkOut,
      raw.nights,
      raw.adults,
      raw.children,
      raw.extraGuestsCount,
      raw.dogs,
      raw.pricePerNight,
      raw.perGuestRate,
      raw.dogRate,
      raw.localTaxRate,
      cached.accommodationTotal,
      cached.extraGuestsTotal,
      cached.dogsTotal,
      raw.cleaningFee,
      cached.localTaxTotal,
      raw.discountAmount,
      raw.discountCode,
      raw.email,
      raw.phone,
      raw.street,
      raw.zip,
      raw.city,
      raw.country,
      raw.invoiceNumber,
      raw.notes,
      raw.createdAt,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const currencyValueCols = [COL.O, COL.P, COL.Q, COL.R, COL.V, COL.X];

  dataRows.forEach((r, i) => {
    const rowIdx = i + 2;

    ws[`${COL.S}${rowIdx}`] = {
      t: "n",
      f: `${COL.O}${rowIdx}*${COL.J}${rowIdx}`,
      v: r.cached.accommodationTotal,
      z: EUR_FMT,
    };
    ws[`${COL.T}${rowIdx}`] = {
      t: "n",
      f: `${COL.M}${rowIdx}*${COL.P}${rowIdx}*${COL.J}${rowIdx}`,
      v: r.cached.extraGuestsTotal,
      z: EUR_FMT,
    };
    ws[`${COL.U}${rowIdx}`] = {
      t: "n",
      f: `${COL.N}${rowIdx}*${COL.Q}${rowIdx}*${COL.J}${rowIdx}`,
      v: r.cached.dogsTotal,
      z: EUR_FMT,
    };
    ws[`${COL.W}${rowIdx}`] = {
      t: "n",
      f: `${COL.K}${rowIdx}*${COL.R}${rowIdx}*${COL.J}${rowIdx}`,
      v: r.cached.localTaxTotal,
      z: EUR_FMT,
    };
    ws[`${COL.E}${rowIdx}`] = {
      t: "n",
      f: `${COL.S}${rowIdx}+${COL.T}${rowIdx}+${COL.U}${rowIdx}+${COL.V}${rowIdx}+${COL.W}${rowIdx}-${COL.X}${rowIdx}`,
      v: r.cached.totalPrice,
      z: EUR_FMT,
    };

    for (const col of currencyValueCols) {
      const addr = `${col}${rowIdx}`;
      const cell = ws[addr];
      if (cell && cell.t === "n") {
        cell.z = EUR_FMT;
      }
    }
  });

  // Column widths
  const rowsForWidth: Record<string, unknown>[] = dataRows.map((r) => ({
    "Buchungs-ID": r.raw.id,
    "Wohnung": r.raw.apartmentName,
    "Vorname": r.raw.firstName,
    "Nachname": r.raw.lastName,
    "Gesamtpreis": r.cached.totalPrice,
    "Status": r.raw.status,
    "Zahlungsstatus": r.raw.paymentStatus,
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
    "E-Mail": r.raw.email,
    "Telefon": r.raw.phone,
    "Straße": r.raw.street,
    "PLZ": r.raw.zip,
    "Ort": r.raw.city,
    "Land": r.raw.country,
    "Rechnungsnummer": r.raw.invoiceNumber,
    "Anmerkungen": r.raw.notes,
    "Erstellt am": r.raw.createdAt,
  }));

  ws["!cols"] = headers.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rowsForWidth.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 36) };
  });
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Buchungen");

  // Sheet 2: Gäste (aggregated)
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
      Gesamtumsatz: g.revenue,
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

    for (let i = 0; i < guestRows.length; i++) {
      const addr = `E${i + 2}`;
      const cell = ws2[addr];
      if (cell && cell.t === "n") {
        cell.z = EUR_FMT;
      }
    }
    ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws2, "Gäste");
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return {
    buffer,
    bookingCount: dataRows.length,
    guestCount: guestRows.length,
  };
}
