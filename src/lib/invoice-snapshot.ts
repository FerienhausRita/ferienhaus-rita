/**
 * Rechnungs-Snapshot
 *
 * Beim Finalisieren wird der aktuelle Stand aller Rechnungs-relevanten
 * Daten eingefroren. PDF-Rendering nutzt ab dann nur noch den Snapshot —
 * spätere Mutationen an apartment-Preisen oder booking-Spalten haben
 * keinen Effekt mehr auf bereits ausgestellte Rechnungen.
 *
 * Diff-Logik erkennt nachträgliche Änderungen und triggert im Admin-UI
 * eine Storno-Empfehlung.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getApartmentWithPricing } from "@/lib/pricing-data";
import { normalizeBankDetails, type BankDetails } from "@/lib/bank-details";
import { contact } from "@/data/contact";

export const INVOICE_SNAPSHOT_VERSION = 1;

export interface InvoicePosition {
  title: string;
  formula?: string;
  amount: number;
}

export interface InvoiceSnapshot {
  version: number;
  created_at: string;
  invoice_number: string;
  issuer: {
    company: string;
    owner?: string;
    address: string;
    vat_id?: string;
    email?: string;
    phone?: string;
  };
  guest: {
    first_name: string;
    last_name: string;
    street: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
  };
  apartment: { id: string; name: string };
  stay: {
    check_in: string;
    check_out: string;
    nights: number;
    adults: number;
    children: number;
    infants: number;
    dogs: number;
  };
  positions: InvoicePosition[];
  extra_line_items: Array<{ label: string; amount: number }>;
  discount: { label: string; amount: number } | null;
  tax: {
    vat_rate: number;
    vat_amount: number;
    local_tax_total: number;
    local_tax_per_night: number;
    local_tax_included: boolean;
  };
  totals: {
    subtotal: number;
    discount_amount: number;
    total: number;
  };
  bank_details: BankDetails | null;
}

interface BookingRow {
  id: string;
  invoice_number: string | null;
  apartment_id: string;
  first_name: string;
  last_name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  check_in: string;
  check_out: string;
  nights: number | null;
  adults: number;
  children: number | null;
  infants: number | null;
  dogs: number | null;
  price_per_night: number | null;
  extra_guests_total: number | null;
  dogs_total: number | null;
  cleaning_fee: number | null;
  local_tax_total: number | null;
  discount_code: string | null;
  discount_amount: number | null;
  total_price: number;
}

interface LineItemRow {
  id: string;
  label: string;
  amount: number;
}

function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function fmtNumber(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtCurrencyShort(amount: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Lädt alle benötigten Daten und baut einen vollständigen Snapshot.
 * Wirft, wenn Buchung oder Apartment fehlt oder invoice_number nicht da.
 */
export async function buildInvoiceSnapshot(
  bookingId: string
): Promise<InvoiceSnapshot> {
  const supabase = createServerClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<BookingRow>();
  if (bookingError || !booking) {
    throw new Error("Buchung nicht gefunden");
  }
  if (!booking.invoice_number) {
    throw new Error(
      "Keine Rechnungsnummer vergeben — Buchung muss erst bestätigt werden"
    );
  }

  const apartment = await getApartmentWithPricing(booking.apartment_id);
  if (!apartment) throw new Error("Wohnung nicht gefunden");

  const { data: lineItemsRaw } = await supabase
    .from("booking_line_items")
    .select("id, label, amount")
    .eq("booking_id", bookingId);
  const lineItems: LineItemRow[] = (lineItemsRaw ?? []) as LineItemRow[];

  // Bank- und Tax-Daten direkt aus site_settings
  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .maybeSingle();
  const bankDetails = normalizeBankDetails(
    bankRow?.value as Record<string, unknown> | null | undefined
  );

  const { data: taxRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "tax_config")
    .maybeSingle();
  const taxCfg = (taxRow?.value ?? {}) as {
    vat_rate?: number;
    local_tax_per_night?: number;
    local_tax_included?: boolean;
  };
  const vatRate = Number(taxCfg.vat_rate ?? 0.1);
  const localTaxPerNight = Number(taxCfg.local_tax_per_night ?? 2.6);
  const localTaxIncluded = Boolean(taxCfg.local_tax_included ?? false);

  const nights = booking.nights ?? calcNights(booking.check_in, booking.check_out);
  const adults = Number(booking.adults || 0);
  const children = Number(booking.children || 0);
  const infants = Number(booking.infants || 0);
  const dogs = Number(booking.dogs || 0);

  // Positionen aus DB-Werten (= eingefrorene Aufenthalts-Daten)
  const positions: InvoicePosition[] = [];

  const pricePerNight = Number(booking.price_per_night || apartment.basePrice);
  const accommodationTotal = fmtNumber(pricePerNight * nights);
  positions.push({
    title: `Unterkunft · ${apartment.name}`,
    formula: `${nights} ${nights === 1 ? "Nacht" : "Nächte"} × ${fmtCurrencyShort(pricePerNight)}`,
    amount: accommodationTotal,
  });

  const extraGuestsTotal = Number(booking.extra_guests_total || 0);
  if (extraGuestsTotal > 0) {
    const totalGuests = adults + children;
    const baseGuests = apartment.baseGuests;
    const extraCount = Math.max(0, totalGuests - baseGuests);
    const perNight =
      extraCount > 0 && nights > 0
        ? fmtNumber(extraGuestsTotal / extraCount / nights)
        : 0;
    positions.push({
      title: `Zusatzpersonen (${extraCount} ${extraCount === 1 ? "Person" : "Personen"})`,
      formula: `${extraCount} × ${fmtCurrencyShort(perNight)}/Nacht × ${nights} Nächte`,
      amount: extraGuestsTotal,
    });
  }

  const dogsTotal = Number(booking.dogs_total || 0);
  if (dogs > 0 && dogsTotal > 0) {
    const firstDog = apartment.firstDogFee ?? apartment.dogFee;
    const additionalDog = apartment.additionalDogFee ?? apartment.dogFee;
    const formula =
      dogs === 1
        ? `1 × ${fmtCurrencyShort(firstDog)}/Nacht × ${nights} Nächte`
        : `1×${fmtCurrencyShort(firstDog)} + ${dogs - 1}×${fmtCurrencyShort(additionalDog)}/Nacht × ${nights} Nächte`;
    positions.push({
      title: dogs === 1 ? "Hund" : `${dogs} Hunde`,
      formula,
      amount: dogsTotal,
    });
  }

  const cleaningFee = Number(booking.cleaning_fee || 0);
  if (cleaningFee > 0) {
    positions.push({
      title: "Endreinigung",
      formula: "einmalig pauschal",
      amount: cleaningFee,
    });
  }

  // Legacy-Kurtaxe (wenn included)
  const localTaxTotal = Number(booking.local_tax_total || 0);
  if (localTaxTotal > 0) {
    const perNight =
      adults > 0 && nights > 0
        ? fmtNumber(localTaxTotal / (adults * nights))
        : localTaxPerNight;
    positions.push({
      title: "Ortstaxe",
      formula: `${adults} Erw. × ${fmtCurrencyShort(perNight)}/Nacht × ${nights} Nächte`,
      amount: localTaxTotal,
    });
  }

  // Zusätzliche Line-Items
  const extraLineItems = lineItems.map((li) => ({
    label: li.label,
    amount: Number(li.amount),
  }));

  // Rabatt
  const discountAmount = Number(booking.discount_amount || 0);
  const discount =
    discountAmount > 0
      ? {
          label: booking.discount_code ?? "Rabatt",
          amount: discountAmount,
        }
      : null;

  // Subtotal vor Rabatt
  const positionsSum = positions.reduce((s, p) => s + p.amount, 0);
  const lineItemsSum = extraLineItems.reduce((s, p) => s + p.amount, 0);
  const subtotal = fmtNumber(positionsSum + lineItemsSum);

  const total = Number(booking.total_price);

  // VAT: total minus Kurtaxe (Kurtaxe ist nicht USt-pflichtig)
  const vatLiableGross = total - localTaxTotal;
  const vatAmount = fmtNumber((vatLiableGross / (1 + vatRate)) * vatRate);

  const snapshot: InvoiceSnapshot = {
    version: INVOICE_SNAPSHOT_VERSION,
    created_at: new Date().toISOString(),
    invoice_number: booking.invoice_number,
    issuer: {
      company: contact.businessName,
      owner: contact.ownerRepresentatives,
      address: `${contact.street}, ${contact.zip} ${contact.city}, ${contact.country}`,
      email: contact.email,
      phone: contact.phone,
    },
    guest: {
      first_name: booking.first_name,
      last_name: booking.last_name,
      street: booking.street,
      zip: booking.zip,
      city: booking.city,
      country: booking.country,
    },
    apartment: { id: apartment.id, name: apartment.name },
    stay: {
      check_in: booking.check_in,
      check_out: booking.check_out,
      nights,
      adults,
      children,
      infants,
      dogs,
    },
    positions,
    extra_line_items: extraLineItems,
    discount,
    tax: {
      vat_rate: vatRate,
      vat_amount: vatAmount,
      local_tax_total: localTaxTotal,
      local_tax_per_night: localTaxPerNight,
      local_tax_included: localTaxIncluded,
    },
    totals: {
      subtotal,
      discount_amount: discountAmount,
      total: fmtNumber(total),
    },
    bank_details: bankDetails,
  };

  return snapshot;
}

/**
 * Vergleicht einen Snapshot mit dem aktuellen DB-Stand der Buchung.
 * Liefert eine Liste mit Diff-Beschreibungen — leeres Array wenn alles passt.
 */
export interface SnapshotDiff {
  field: string;
  snapshot: string;
  current: string;
}

export function compareSnapshotWithBooking(
  snapshot: InvoiceSnapshot,
  booking: {
    first_name: string;
    last_name: string;
    apartment_id: string;
    check_in: string;
    check_out: string;
    adults: number;
    children: number | null;
    dogs: number | null;
    total_price: number;
    discount_amount: number | null;
  }
): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  if (snapshot.guest.first_name !== booking.first_name) {
    diffs.push({
      field: "Vorname",
      snapshot: snapshot.guest.first_name,
      current: booking.first_name,
    });
  }
  if (snapshot.guest.last_name !== booking.last_name) {
    diffs.push({
      field: "Nachname",
      snapshot: snapshot.guest.last_name,
      current: booking.last_name,
    });
  }
  if (snapshot.apartment.id !== booking.apartment_id) {
    diffs.push({
      field: "Wohnung",
      snapshot: snapshot.apartment.id,
      current: booking.apartment_id,
    });
  }
  if (snapshot.stay.check_in !== booking.check_in) {
    diffs.push({
      field: "Anreise",
      snapshot: snapshot.stay.check_in,
      current: booking.check_in,
    });
  }
  if (snapshot.stay.check_out !== booking.check_out) {
    diffs.push({
      field: "Abreise",
      snapshot: snapshot.stay.check_out,
      current: booking.check_out,
    });
  }
  if (snapshot.stay.adults !== booking.adults) {
    diffs.push({
      field: "Personen",
      snapshot: String(snapshot.stay.adults),
      current: String(booking.adults),
    });
  }
  if (snapshot.stay.children !== (booking.children ?? 0)) {
    diffs.push({
      field: "Kinder (zusätzl.)",
      snapshot: String(snapshot.stay.children),
      current: String(booking.children ?? 0),
    });
  }
  if (snapshot.stay.dogs !== (booking.dogs ?? 0)) {
    diffs.push({
      field: "Hunde",
      snapshot: String(snapshot.stay.dogs),
      current: String(booking.dogs ?? 0),
    });
  }
  if (Math.abs(snapshot.totals.total - Number(booking.total_price)) > 0.01) {
    diffs.push({
      field: "Gesamtbetrag",
      snapshot: fmtMoney(snapshot.totals.total),
      current: fmtMoney(Number(booking.total_price)),
    });
  }
  const snapDiscount = snapshot.discount?.amount ?? 0;
  const curDiscount = Number(booking.discount_amount || 0);
  if (Math.abs(snapDiscount - curDiscount) > 0.01) {
    diffs.push({
      field: "Rabatt",
      snapshot: fmtMoney(snapDiscount),
      current: fmtMoney(curDiscount),
    });
  }

  return diffs;
}
