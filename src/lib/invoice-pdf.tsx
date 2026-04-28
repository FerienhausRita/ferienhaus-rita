import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import type { Apartment } from "@/data/apartments";
import type { ContactData } from "@/data/contact";
import type { InvoiceSnapshot } from "@/lib/invoice-snapshot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: string;
  apartment_id: string;
  check_in: string;
  check_out: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  street: string;
  zip: string;
  city: string;
  country: string;
  adults: number;
  children: number;
  infants?: number;
  dogs: number;
  total_price: number;
  invoice_number: string;
  notes: string | null;
}

export interface BankDetails {
  iban: string;
  bic: string;
  account_holder: string;
  bank_name: string;
}

export interface InvoiceData {
  booking: BookingRow;
  apartment: Apartment;
  bankDetails: BankDetails;
  contact: ContactData;
  /**
   * Wenn vorhanden: PDF rendert AUS dem Snapshot (= eingefrorene Rechnungsdaten)
   * statt aus apartment-Config + booking neu zu berechnen.
   */
  snapshot?: InvoiceSnapshot | null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmtCurrency(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, decimals] = fixed.split(".");
  const withDots = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = amount < 0 ? "-" : "";
  return `${sign}${withDots},${decimals} \u20AC`;
}

function fmtDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

const LOCAL_TAX_PER_PERSON_PER_NIGHT = 2.5;
const VAT_RATE = 0.1;

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const GOLD = "#c8a96e";
const GOLD_LIGHT = "#f6efe3";
const DARK = "#1c1917";
const GRAY = "#57534e";
const GRAY_LIGHT = "#a8a29e";
const BG_SOFT = "#faf8f5";
const LINE = "#e7e5e4";
const LINE_SOFT = "#f5f4f2";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 44,
    paddingBottom: 70,
    paddingHorizontal: 44,
    lineHeight: 1.45,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoText: {
    fontSize: 16,
    fontFamily: "Times-Bold",
    color: "#ffffff",
    letterSpacing: 1,
  },
  brandBlock: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 19,
    fontFamily: "Times-Bold",
    color: DARK,
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 8,
    fontFamily: "Times-Italic",
    color: GOLD,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  invoiceBox: {
    borderWidth: 0.5,
    borderColor: GOLD,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 3,
    alignItems: "flex-end",
    minWidth: 140,
  },
  invoiceBoxLabel: {
    fontSize: 7,
    color: GOLD,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  invoiceNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  invoiceDate: {
    fontSize: 8,
    color: GRAY,
    marginTop: 2,
  },

  headerDivider: {
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 24,
  },

  // ── Addresses (two columns) ──
  addressGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  addressCol: {
    flex: 1,
    backgroundColor: BG_SOFT,
    padding: 12,
    borderRadius: 4,
  },
  addressLabel: {
    fontSize: 7,
    color: GOLD,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  addressLine: {
    fontSize: 9,
    color: DARK,
    marginBottom: 1,
  },
  addressMuted: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 1,
  },

  // ── Service period ──
  serviceBlock: {
    flexDirection: "row",
    marginBottom: 22,
  },
  serviceAccent: {
    width: 3,
    backgroundColor: GOLD,
    marginRight: 12,
  },
  serviceContent: {
    flex: 1,
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 7,
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  serviceValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  serviceSubValue: {
    fontSize: 9,
    color: GRAY,
    marginTop: 2,
  },

  // ── Positions table ──
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: GOLD_LIGHT,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_SOFT,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE_SOFT,
    backgroundColor: BG_SOFT,
  },
  colDesc: {
    flex: 1,
    paddingRight: 8,
  },
  colTotal: {
    width: 95,
    textAlign: "right" as const,
    alignItems: "flex-end" as const,
  },
  th: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  posTitle: {
    fontSize: 10,
    color: DARK,
    marginBottom: 2,
  },
  posFormula: {
    fontSize: 8,
    color: GRAY_LIGHT,
  },
  posAmount: {
    fontSize: 10,
    color: DARK,
  },

  // ── Totals ──
  totals: {
    alignItems: "flex-end" as const,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: "row",
    width: 260,
    paddingVertical: 2,
  },
  totalLabel: {
    flex: 1,
    fontSize: 9,
    color: GRAY,
  },
  totalValue: {
    width: 100,
    textAlign: "right" as const,
    fontSize: 9,
    color: DARK,
  },
  totalDivider: {
    width: 260,
    height: 1,
    backgroundColor: GOLD,
    marginVertical: 6,
  },
  grandRow: {
    flexDirection: "row",
    width: 260,
    paddingVertical: 2,
  },
  grandLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  grandValue: {
    width: 100,
    textAlign: "right" as const,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
  },
  totalHint: {
    fontSize: 7,
    color: GRAY_LIGHT,
    textAlign: "right" as const,
    width: 260,
    marginTop: 4,
  },

  // ── Payment info ──
  paymentBox: {
    borderWidth: 0.5,
    borderColor: GOLD,
    borderRadius: 4,
    padding: 14,
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 7,
    color: GOLD,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  paymentLabel: {
    width: 120,
    fontSize: 9,
    color: GRAY,
  },
  paymentValue: {
    flex: 1,
    fontSize: 9,
    color: DARK,
  },
  paymentValueMono: {
    flex: 1,
    fontSize: 9,
    color: DARK,
    fontFamily: "Courier-Bold",
    letterSpacing: 0.5,
  },
  refBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    flexDirection: "row",
  },
  refLabel: {
    width: 120,
    fontSize: 9,
    color: GRAY,
  },
  refValue: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Courier-Bold",
    color: DARK,
    letterSpacing: 0.5,
  },

  // ── Footer ──
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 44,
    right: 44,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: GOLD,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  footerCenter: {
    flex: 1,
    alignItems: "center",
  },
  footerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  footerThank: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    color: GOLD,
  },
  footerDetail: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.4,
  },
  footerPage: {
    fontSize: 7,
    color: GRAY_LIGHT,
  },
});

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function PositionRow({
  title,
  formula,
  amount,
  alt,
}: {
  title: string;
  formula?: string;
  amount: number;
  alt?: boolean;
}) {
  return (
    <View style={alt ? styles.tableRowAlt : styles.tableRow}>
      <View style={styles.colDesc}>
        <Text style={styles.posTitle}>{title}</Text>
        {formula ? <Text style={styles.posFormula}>{formula}</Text> : null}
      </View>
      <View style={styles.colTotal}>
        <Text style={styles.posAmount}>{fmtCurrency(amount)}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Invoice PDF
// ---------------------------------------------------------------------------

function InvoicePdf({ data }: { data: InvoiceData }) {
  const { booking, apartment, bankDetails: rawBankDetails, contact, snapshot } = data;
  // Defensive fallback: Legacy-Datensätze hatten `holder` statt `account_holder`.
  const bankDetails: BankDetails = snapshot?.bank_details
    ? {
        iban: snapshot.bank_details.iban,
        bic: snapshot.bank_details.bic,
        bank_name: snapshot.bank_details.bank_name,
        account_holder: snapshot.bank_details.account_holder,
      }
    : {
        ...rawBankDetails,
        account_holder:
          (rawBankDetails.account_holder && rawBankDetails.account_holder.trim()) ||
          ((rawBankDetails as unknown as { holder?: string }).holder ?? "").trim(),
      };

  const nights = snapshot?.stay.nights ?? calculateNights(booking.check_in, booking.check_out);

  // Snapshot-Modus: Positionen + Steuern aus Snapshot übernehmen
  let positions: Array<{ title: string; formula?: string; amount: number }>;
  let localTaxTotal: number;
  let vatAmount: number;
  let totalForDisplay: number;
  let discount: { label: string; amount: number } | null;
  let extraLineItems: Array<{ label: string; amount: number }>;

  if (snapshot) {
    positions = [...snapshot.positions];
    localTaxTotal = snapshot.tax.local_tax_total;
    vatAmount = snapshot.tax.vat_amount;
    totalForDisplay = snapshot.totals.total;
    discount =
      snapshot.discount && snapshot.discount.amount > 0
        ? { label: snapshot.discount.label, amount: snapshot.discount.amount }
        : null;
    extraLineItems = snapshot.extra_line_items ?? [];
  } else {
    // Legacy-Pfad: keine Snapshot-Daten → live-Berechnung wie bisher
    const basePricePerNight = apartment.basePrice;
    const accommodationTotal = basePricePerNight * nights;
    const extraAdultPrice = apartment.extraAdultPrice ?? apartment.extraPersonPrice;
    const extraGuestsCount = Math.max(0, booking.adults + booking.children - apartment.baseGuests);
    const extraGuestsTotal = extraGuestsCount * extraAdultPrice * nights;
    const firstDogFee = apartment.firstDogFee ?? apartment.dogFee;
    const additionalDogFee = apartment.additionalDogFee ?? apartment.dogFee;
    const dogsPerNight =
      booking.dogs === 0
        ? 0
        : firstDogFee + Math.max(0, booking.dogs - 1) * additionalDogFee;
    const dogsTotal = dogsPerNight * nights;
    const cleaningFee = apartment.cleaningFee;

    const positionsSum = accommodationTotal + extraGuestsTotal + dogsTotal + cleaningFee;
    const implicitLocalTax = Math.max(0, booking.total_price - positionsSum);
    localTaxTotal = implicitLocalTax > 0.5 ? Math.round(implicitLocalTax * 100) / 100 : 0;

    const vatLiableGross = booking.total_price - localTaxTotal;
    vatAmount = Math.round(((vatLiableGross / (1 + VAT_RATE)) * VAT_RATE) * 100) / 100;
    totalForDisplay = booking.total_price;
    discount = null;
    extraLineItems = [];

    positions = [];
    positions.push({
      title: `Unterkunft · ${apartment.name}`,
      formula: `${nights} ${nights === 1 ? "Nacht" : "Nächte"} × ${fmtCurrency(basePricePerNight)}/Nacht`,
      amount: accommodationTotal,
    });
    if (extraGuestsCount > 0) {
      positions.push({
        title: `Zusatzpersonen (${extraGuestsCount} ${extraGuestsCount === 1 ? "Person" : "Personen"})`,
        formula: `${extraGuestsCount} × ${fmtCurrency(extraAdultPrice)}/Nacht × ${nights} Nächte`,
        amount: extraGuestsTotal,
      });
    }
    if (booking.dogs > 0) {
      const dogFormula =
        booking.dogs === 1
          ? `1 × ${fmtCurrency(firstDogFee)}/Nacht × ${nights} Nächte`
          : `1×${fmtCurrency(firstDogFee)} + ${booking.dogs - 1}×${fmtCurrency(additionalDogFee)}/Nacht × ${nights} Nächte`;
      positions.push({
        title: booking.dogs === 1 ? "Hund" : `${booking.dogs} Hunde`,
        formula: dogFormula,
        amount: dogsTotal,
      });
    }
    positions.push({
      title: "Endreinigung",
      formula: "einmalig pauschal",
      amount: cleaningFee,
    });
    if (localTaxTotal > 0) {
      const legacyRate =
        booking.adults > 0 && nights > 0
          ? Math.round((localTaxTotal / (booking.adults * nights)) * 100) / 100
          : LOCAL_TAX_PER_PERSON_PER_NIGHT;
      positions.push({
        title: "Kurtaxe",
        formula: `${booking.adults} Erw. × ${fmtCurrency(legacyRate)}/Nacht × ${nights} Nächte`,
        amount: localTaxTotal,
      });
    }
  }

  const invoiceDate = snapshot
    ? fmtDate(new Date(snapshot.created_at))
    : fmtDate(new Date());
  const paymentRef = `FR-${booking.id.substring(0, 8).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>FR</Text>
            </View>
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>{contact.businessName}</Text>
              <Text style={styles.brandTagline}>Ihr Zuhause in den Alpen</Text>
            </View>
          </View>
          <View style={styles.invoiceBox}>
            <Text style={styles.invoiceBoxLabel}>Rechnung</Text>
            <Text style={styles.invoiceNumber}>{booking.invoice_number}</Text>
            <Text style={styles.invoiceDate}>{invoiceDate}</Text>
          </View>
        </View>
        <View style={styles.headerDivider} />

        {/* Addresses */}
        <View style={styles.addressGrid}>
          <View style={styles.addressCol}>
            <Text style={styles.addressLabel}>Von</Text>
            <Text style={styles.addressLine}>{contact.businessName}</Text>
            <Text style={styles.addressMuted}>{contact.ownerName}</Text>
            <Text style={styles.addressMuted}>{contact.street}</Text>
            <Text style={styles.addressMuted}>
              {contact.zip} {contact.city}
            </Text>
            <Text style={styles.addressMuted}>{contact.country}</Text>
            <Text style={[styles.addressMuted, { marginTop: 4 }]}>
              {contact.phone} · {contact.email}
            </Text>
            {(contact.taxNumber || contact.uid) && (
              <Text style={[styles.addressMuted, { marginTop: 2 }]}>
                {contact.taxNumber ? `StNr: ${contact.taxNumber}` : ""}
                {contact.taxNumber && contact.uid ? " · " : ""}
                {contact.uid ? `UID: ${contact.uid}` : ""}
              </Text>
            )}
          </View>
          <View style={styles.addressCol}>
            <Text style={styles.addressLabel}>Rechnung an</Text>
            <Text style={styles.addressLine}>
              {booking.first_name} {booking.last_name}
            </Text>
            <Text style={styles.addressMuted}>{booking.street}</Text>
            <Text style={styles.addressMuted}>
              {booking.zip} {booking.city}
            </Text>
            {booking.country ? (
              <Text style={styles.addressMuted}>{booking.country}</Text>
            ) : null}
            <Text style={[styles.addressMuted, { marginTop: 4 }]}>
              {booking.email}
            </Text>
          </View>
        </View>

        {/* Service period */}
        <View style={styles.serviceBlock}>
          <View style={styles.serviceAccent} />
          <View style={styles.serviceContent}>
            <Text style={styles.serviceLabel}>Leistungszeitraum</Text>
            <Text style={styles.serviceValue}>
              {fmtDate(booking.check_in)} – {fmtDate(booking.check_out)}
            </Text>
            <Text style={styles.serviceSubValue}>
              {nights} {nights === 1 ? "Nacht" : "Nächte"} ·{" "}
              {booking.adults} Erw.
              {booking.children > 0
                ? `, ${booking.children} ${booking.children === 1 ? "Kind" : "Kinder"}`
                : ""}
              {booking.dogs > 0
                ? `, ${booking.dogs} ${booking.dogs === 1 ? "Hund" : "Hunde"}`
                : ""}
            </Text>
          </View>
        </View>

        {/* Positions table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}>
              <Text style={styles.th}>Beschreibung</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.th}>Betrag</Text>
            </View>
          </View>
          {positions.map((p, i) => (
            <PositionRow
              key={i}
              title={p.title}
              formula={p.formula}
              amount={p.amount}
              alt={i % 2 === 1}
            />
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          {/* Zusätzliche Line-Items (z.B. Babybett) */}
          {extraLineItems.map((li, idx) => (
            <View key={`li-${idx}`} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{li.label}</Text>
              <Text style={styles.totalValue}>{fmtCurrency(li.amount)}</Text>
            </View>
          ))}
          {/* Rabatt-Zeile */}
          {discount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Rabatt ({discount.label})</Text>
              <Text style={styles.totalValue}>
                −{fmtCurrency(discount.amount)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Zwischensumme</Text>
            <Text style={styles.totalValue}>{fmtCurrency(totalForDisplay)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>davon 10 % USt.</Text>
            <Text style={styles.totalValue}>{fmtCurrency(vatAmount)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Gesamtbetrag</Text>
            <Text style={styles.grandValue}>{fmtCurrency(totalForDisplay)}</Text>
          </View>
          {localTaxTotal > 0 ? (
            <Text style={styles.totalHint}>
              Kurtaxe ist eine öffentliche Abgabe und nicht umsatzsteuerpflichtig.
            </Text>
          ) : (
            <Text style={styles.totalHint}>
              Die Kurtaxe wurde bzw. wird separat abgerechnet
              und ist nicht im Gesamtbetrag enthalten.
            </Text>
          )}
          {(booking.infants ?? 0) > 0 && (
            <Text style={styles.totalHint}>
              Inkl. {booking.infants} Kleinkind{booking.infants === 1 ? "" : "er"} unter 3 Jahren (kostenfrei).
            </Text>
          )}
        </View>

        {/* Payment info */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Überweisungsinformationen</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Kontoinhaber</Text>
            <Text style={styles.paymentValue}>{bankDetails.account_holder}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>IBAN</Text>
            <Text style={styles.paymentValueMono}>{bankDetails.iban}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>BIC</Text>
            <Text style={styles.paymentValueMono}>{bankDetails.bic}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Bank</Text>
            <Text style={styles.paymentValue}>{bankDetails.bank_name}</Text>
          </View>
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Verwendungszweck</Text>
            <Text style={styles.refValue}>{paymentRef}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerDetail}>
                {contact.street}, {contact.zip} {contact.city}
              </Text>
              <Text style={styles.footerDetail}>
                {contact.phone} · {contact.email}
              </Text>
            </View>
            <View style={styles.footerCenter}>
              <Text style={styles.footerThank}>
                Vielen Dank für Ihren Aufenthalt!
              </Text>
            </View>
            <View style={styles.footerRight}>
              <Text
                style={styles.footerPage}
                render={({ pageNumber, totalPages }) =>
                  `Seite ${pageNumber} von ${totalPages}`
                }
              />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return (await renderToBuffer(<InvoicePdf data={data} />)) as Buffer;
}
