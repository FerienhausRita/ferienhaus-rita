import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
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
  company?: string | null;
  vat_id?: string | null;
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

export interface InvoicePayment {
  id: string;
  amount: number;
  paid_at: string;
  applies_to: string;
  method?: string | null;
  note?: string | null;
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
  /**
   * Live aus DB geladen — bezahlte Beträge werden vom Total abgezogen,
   * offener Betrag wird in der Bankbox ausgewiesen.
   */
  payments?: InvoicePayment[];
  /** Dokumenttyp: reguläre Rechnung (default), Stornorechnung oder Korrektur. */
  documentType?: "invoice" | "storno" | "correction";
  /** Pflicht-Verweis auf die Originalrechnung (bei Storno/Korrektur). */
  relatedInvoice?: { number: string; date?: string | null } | null;
  /** Grund der Stornierung/Korrektur. */
  reason?: string | null;
  /** Vorab erzeugter GiroCode/EPC-QR (data-URL) für die Zahlung; intern gesetzt. */
  qrDataUrl?: string | null;
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

/** Ländercode → ausgeschriebener Name (sonst unverändert). */
function fmtCountry(c: string | null | undefined): string {
  const v = (c || "").trim();
  const map: Record<string, string> = {
    AT: "Österreich",
    DE: "Deutschland",
    CH: "Schweiz",
    IT: "Italien",
    LI: "Liechtenstein",
  };
  return map[v.toUpperCase()] ?? v;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

// Direktion „Höhenlinien" – ruhiger Luxus, am Großglockner verankert.
const GOLD = "#a8863f"; // gedämpftes Messing-Gold, nur als Akzent/Haarlinie
const GOLD_LIGHT = "#f3ece0"; // sehr sparsam
const DARK = "#1b1a17"; // warmes Tinten-Schwarz
const GRAY = "#6b6660"; // Sekundärtext
const GRAY_LIGHT = "#9a958c"; // Labels / Tertiär
const BG_SOFT = "#fbfaf8"; // Hauch, keine Karten-Optik
const LINE = "#e6e2d9"; // Haarlinie
const LINE_SOFT = "#efece6";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 1.3,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoText: {
    fontSize: 15,
    fontFamily: "Times-Bold",
    color: "#ffffff",
    // letterSpacing entfernt — würde nach dem letzten Buchstaben
    // einen Spacing-Slot lassen → Text optisch nach rechts verschoben
    // textAlign auf View-Level zentriert via parent justifyContent/alignItems
    paddingLeft: 1, // visueller Ausgleich für minimalen optical-axis Versatz
  },
  brandRule: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: GOLD,
    marginRight: 14,
  },
  brandBlock: {
    flexDirection: "column",
    justifyContent: "center",
    paddingVertical: 1,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: DARK,
    letterSpacing: 0.4,
    lineHeight: 1.12,
  },
  brandEyebrow: {
    fontSize: 6.5,
    fontFamily: "Helvetica",
    color: GRAY_LIGHT,
    marginTop: 5,
    letterSpacing: 1.3,
  },
  invoiceMeta: {
    alignItems: "flex-end",
    minWidth: 150,
    paddingTop: 2,
  },
  invoiceBoxLabel: {
    fontSize: 8,
    color: GRAY_LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 2.5,
    fontFamily: "Helvetica",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 13,
    fontFamily: "Times-Bold",
    color: DARK,
    letterSpacing: 0.5,
  },
  invoiceDate: {
    fontSize: 8,
    color: GRAY,
    marginTop: 3,
  },

  headerDivider: {
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 10,
  },

  // ── Addresses (offen, Haarlinien statt Karten) ──
  addressGrid: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 14,
  },
  addressCol: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 7,
    color: GRAY_LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
    fontFamily: "Helvetica",
    marginBottom: 5,
  },
  addressLine: {
    fontSize: 10,
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
    marginBottom: 12,
  },
  serviceAccent: {
    width: 2,
    backgroundColor: GOLD,
    marginRight: 12,
  },
  serviceContent: {
    flex: 1,
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 7,
    color: GRAY_LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
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
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 5,
    paddingHorizontal: 2,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: DARK,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
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
    fontFamily: "Helvetica",
    color: GRAY_LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 1.8,
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
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    width: 260,
    paddingVertical: 1.5,
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
    backgroundColor: DARK,
    marginVertical: 5,
  },
  grandRow: {
    flexDirection: "row",
    width: 260,
    paddingVertical: 1.5,
    alignItems: "baseline",
  },
  grandLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Times-Bold",
    color: DARK,
    letterSpacing: 0.3,
  },
  grandValue: {
    width: 100,
    textAlign: "right" as const,
    fontSize: 15,
    fontFamily: "Times-Bold",
    color: DARK,
  },
  totalHint: {
    fontSize: 7,
    color: GRAY_LIGHT,
    textAlign: "right" as const,
    width: 260,
    marginTop: 4,
  },

  // ── Payment info (offen, oben Haarlinie statt Rahmenkasten) ──
  paymentBox: {
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 9,
    marginTop: 2,
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 7,
    color: GRAY_LIGHT,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
    fontFamily: "Helvetica",
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 2,
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
    marginTop: 6,
    paddingTop: 6,
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
  paymentBoxInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentDetails: {
    flex: 1,
  },
  qrBox: {
    width: 98,
    alignItems: "center",
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: LINE,
  },
  qrImage: {
    width: 74,
    height: 74,
  },
  qrCaption: {
    fontSize: 7,
    color: DARK,
    marginTop: 4,
    textAlign: "center" as const,
  },
  qrCaptionSub: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    marginTop: 1,
    textAlign: "center" as const,
  },
  pageNum: {
    position: "absolute" as const,
    top: 822, // A4 = 841.89pt; ~20pt vom unteren Rand (top statt bottom: s. o.)
    right: 40,
    fontSize: 7,
    color: GRAY_LIGHT,
    textAlign: "right" as const,
  },

  // ── Bezahlt-Vermerk (zurückhaltend, graviert) ──
  paidStamp: {
    marginTop: 2,
    marginBottom: 8,
    paddingTop: 9,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
  },
  paidStampText: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    color: DARK,
    letterSpacing: 0.5,
  },
  paidStampSubtext: {
    fontSize: 8,
    color: GRAY,
    marginTop: 3,
  },

  // ── Dankesnote (offen, mittig, zurückhaltend) ──
  thankBlock: {
    marginTop: 10,
    marginBottom: 2,
    alignItems: "center",
  },
  thankText: {
    fontSize: 11,
    fontFamily: "Times-Italic",
    color: DARK,
    textAlign: "center" as const,
  },
  thankSubtext: {
    fontSize: 9,
    color: GRAY,
    marginTop: 2,
  },

  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
  },
  footerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },
  footerCol: {
    flex: 1,
  },
  footerHeading: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  footerDetail: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.3,
  },
  footerDetailMono: {
    fontSize: 7,
    fontFamily: "Courier",
    color: GRAY,
    letterSpacing: 0.5,
    lineHeight: 1.3,
  },
  footerLegal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.3,
    borderTopColor: LINE,
  },
  footerLegalText: {
    fontSize: 6.5,
    color: GRAY_LIGHT,
    lineHeight: 1.3,
  },
  footerTax: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.3,
  },
  footerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  footerPage: {
    fontSize: 7,
    color: GRAY_LIGHT,
  },
});

// ---------------------------------------------------------------------------
// Markenelemente (Signatur: graviertes Monogramm + Bergkamm-Linie)
// ---------------------------------------------------------------------------

/** Bergkamm-Trennlinie – die Signatur des Briefpapiers: eine ruhige
 *  Großglockner-Silhouette mit klarem Hauptgipfel (kein Zickzack). */
function RidgelineDivider({ width = 515 }: { width?: number }) {
  // ferner Grat (hell, zurückgesetzt) + naher Grat (gold) mit Leitgipfel ~x205
  const far =
    "M0 16 L80 14 L150 14.5 L195 10 L225 12 L285 9 L350 12.5 L410 10.5 L470 13 L" +
    width +
    " 14.5";
  const near =
    "M0 18 L70 16 L130 16.5 L175 13 L205 6.5 L240 12 L300 13.5 L360 11 L420 14.5 L470 13 L" +
    width +
    " 15.5";
  return (
    <Svg width={width} height={20} viewBox={`0 0 ${width} 20`} style={{ marginBottom: 13 }}>
      <Path d={far} stroke={LINE} strokeWidth={0.6} fill="none" />
      <Path d={near} stroke={GOLD} strokeWidth={0.7} fill="none" />
    </Svg>
  );
}

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
    <View style={alt ? styles.tableRowAlt : styles.tableRow} wrap={false}>
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
  const { booking, apartment, bankDetails: rawBankDetails, contact, snapshot, payments = [] } = data;
  const documentType = data.documentType ?? "invoice";
  const isFollowUp = documentType === "storno" || documentType === "correction";
  const docLabel =
    documentType === "storno"
      ? "Stornorechnung"
      : documentType === "correction"
        ? "Rechnungskorrektur"
        : "Rechnung";
  const relatedInvoice = data.relatedInvoice ?? null;
  const qrDataUrl = data.qrDataUrl ?? null;
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

  // Bezahlte Beträge live aus DB summieren
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstandingAmount = Math.max(
    0,
    Math.round((totalForDisplay - totalPaid) * 100) / 100
  );
  const isFullyPaid = totalPaid >= totalForDisplay - 0.01;
  const dueDateForDisplay =
    (booking as { remainder_due_date?: string | null }).remainder_due_date ||
    (booking as { deposit_due_date?: string | null }).deposit_due_date ||
    null;

  // USt-Aufschlüsselung (Netto / USt / Brutto). Ortstaxe ist nicht steuerbar.
  const vatRatePct = snapshot ? Math.round(snapshot.tax.vat_rate * 100) : VAT_RATE * 100;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const vatLiableGross = r2(totalForDisplay - localTaxTotal); // steuerpflichtiger Brutto-Anteil
  const netAmount = r2(vatLiableGross - vatAmount);
  // Kleinbetragsrechnung gem. § 11 Abs. 6 UStG (Bruttobetrag ≤ 400 €).
  const isKleinbetrag = Math.abs(totalForDisplay) <= 400;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Seitenzahl — nur mehrseitig. Über top positioniert (react-pdf rendert
            den render-Callback auf fixed-Elementen nur mit top, nicht mit bottom). */}
        <Text
          fixed
          style={styles.pageNum}
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            totalPages > 1 ? `Seite ${pageNumber} von ${totalPages}` : ""
          }
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandRule} />
            <View style={styles.brandBlock}>
              <Text style={styles.brandName}>{contact.businessName}</Text>
              <Text style={styles.brandEyebrow}>
                KALS AM GROSSGLOCKNER · OSTTIROL · 1.325 M
              </Text>
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceBoxLabel}>{docLabel}</Text>
            <Text style={styles.invoiceNumber}>{booking.invoice_number}</Text>
            <Text style={styles.invoiceDate}>{invoiceDate}</Text>
          </View>
        </View>
        <RidgelineDivider />

        {/* Pflicht-Verweis auf die Originalrechnung (Storno/Korrektur) */}
        {isFollowUp && relatedInvoice && (
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: GOLD,
              paddingLeft: 10,
              paddingVertical: 2,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 9, color: DARK }}>
              {documentType === "storno"
                ? "Diese Stornorechnung storniert die "
                : "Diese Rechnungskorrektur berichtigt die "}
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Rechnung {relatedInvoice.number}
              </Text>
              {relatedInvoice.date ? ` vom ${fmtDate(relatedInvoice.date)}` : ""}.
            </Text>
            {data.reason ? (
              <Text style={{ fontSize: 8, color: GRAY, marginTop: 3 }}>
                Grund: {data.reason}
              </Text>
            ) : null}
          </View>
        )}

        {/* Empfänger (Absenderdaten stehen in der Fußnote) */}
        <View style={styles.addressGrid} wrap={false}>
          <View style={styles.addressCol}>
            <Text style={styles.addressLabel}>Rechnung an</Text>
            {booking.company ? (
              <>
                <Text style={styles.addressLine}>{booking.company}</Text>
                <Text style={styles.addressMuted}>
                  z. Hd. {booking.first_name} {booking.last_name}
                </Text>
              </>
            ) : (
              <Text style={styles.addressLine}>
                {booking.first_name} {booking.last_name}
              </Text>
            )}
            <Text style={styles.addressMuted}>{booking.street}</Text>
            <Text style={styles.addressMuted}>
              {booking.zip} {booking.city}
            </Text>
            {booking.country ? (
              <Text style={styles.addressMuted}>{fmtCountry(booking.country)}</Text>
            ) : null}
            {booking.vat_id ? (
              <Text style={styles.addressMuted}>UID: {booking.vat_id}</Text>
            ) : null}
            <Text style={[styles.addressMuted, { marginTop: 4 }]}>
              {booking.email}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>

        {/* Service period */}
        <View style={styles.serviceBlock} wrap={false}>
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
          {positions
            // Ortstaxe ist ein durchlaufender Posten (nicht steuerbar) und wird
            // ausschließlich in der Summenaufstellung gezeigt – nicht als Position.
            .filter((p) => !/^(ortstaxe|kurtaxe)/i.test(p.title))
            .map((p, i) => (
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
        <View style={styles.totals} wrap={false}>
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
            <Text style={styles.totalLabel}>Nettobetrag (Bemessungsgrundlage)</Text>
            <Text style={styles.totalValue}>{fmtCurrency(netAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>zzgl. {vatRatePct} % USt (Beherbergung)</Text>
            <Text style={styles.totalValue}>{fmtCurrency(vatAmount)}</Text>
          </View>
          {localTaxTotal !== 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Bruttobetrag (steuerpflichtig)</Text>
                <Text style={styles.totalValue}>{fmtCurrency(vatLiableGross)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Ortstaxe (nicht steuerbar)</Text>
                <Text style={styles.totalValue}>{fmtCurrency(localTaxTotal)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Gesamtbetrag</Text>
            <Text style={styles.grandValue}>{fmtCurrency(totalForDisplay)}</Text>
          </View>
          {localTaxTotal === 0 && (
            <Text style={styles.totalHint}>
              Die Ortstaxe ist eine öffentliche Abgabe (nicht umsatzsteuerbar) und wird
              separat abgerechnet — nicht im Gesamtbetrag enthalten.
            </Text>
          )}
          {isKleinbetrag && !isFollowUp && (
            <Text style={styles.totalHint}>Kleinbetragsrechnung gemäß § 11 Abs. 6 UStG.</Text>
          )}
          {(booking.infants ?? 0) > 0 && (
            <Text style={styles.totalHint}>
              Inkl. {booking.infants} Kleinkind{booking.infants === 1 ? "" : "er"} unter 3 Jahren (kostenfrei).
            </Text>
          )}
        </View>

        {/* Bereits geleistete Zahlungen — aus booking_payments live geladen */}
        {!isFollowUp && payments.length > 0 && (
          <View style={[styles.totals, { marginTop: 4 }]} wrap={false}>
            {payments.map((p) => {
              const label =
                p.applies_to === "deposit"
                  ? "Anzahlung erhalten"
                  : p.applies_to === "remainder"
                  ? "Restzahlung erhalten"
                  : "Zahlung erhalten";
              return (
                <View key={p.id} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    {label} ({fmtDate(p.paid_at)})
                  </Text>
                  <Text style={[styles.totalValue, { color: GRAY }]}>
                    −{fmtCurrency(Number(p.amount))}
                  </Text>
                </View>
              );
            })}
            <View style={styles.totalDivider} />
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>
                {isFullyPaid ? "Bezahlt" : "Offener Betrag"}
              </Text>
              <Text style={styles.grandValue}>
                {isFullyPaid ? fmtCurrency(totalPaid) : fmtCurrency(outstandingAmount)}
              </Text>
            </View>
            {isFullyPaid ? (
              <Text style={[styles.totalHint, { color: GRAY }]}>
                Vollständig bezahlt — keine Überweisung erforderlich.
              </Text>
            ) : dueDateForDisplay ? (
              <Text style={[styles.totalHint, { color: GRAY }]}>
                Bitte überweisen Sie den offenen Betrag bis spätestens {fmtDate(dueDateForDisplay)}.
              </Text>
            ) : null}
          </View>
        )}

        {/* Bankverbindung — nur anzeigen wenn noch was offen ist */}
        {!isFollowUp && !isFullyPaid && (
          <View style={styles.paymentBox} wrap={false}>
            <View style={styles.paymentBoxInner}>
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle}>
                  Überweisungsinformationen{payments.length > 0 ? " für den Restbetrag" : ""}
                </Text>
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
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Betrag</Text>
                  <Text style={styles.paymentValue}>{fmtCurrency(outstandingAmount)}</Text>
                </View>
                <View style={styles.refBox}>
                  <Text style={styles.refLabel}>Verwendungszweck</Text>
                  <Text style={styles.refValue}>{paymentRef}</Text>
                </View>
              </View>
              {qrDataUrl ? (
                <View style={styles.qrBox}>
                  <Image src={qrDataUrl} style={styles.qrImage} />
                  <Text style={styles.qrCaption}>Mit Banking-App scannen</Text>
                  <Text style={styles.qrCaptionSub}>GiroCode · SEPA</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Dankesnote + Fußnote bleiben zusammen (kein Umbruch dazwischen) */}
        <View wrap={false}>
        {!isFollowUp && (
          <View style={styles.thankBlock}>
            <Text style={styles.thankText}>
              Vielen Dank für Ihren Aufenthalt im {contact.businessName} — wir freuen uns auf
              ein Wiedersehen in Kals!
            </Text>
          </View>
        )}

        {/* Fußnote mit Absender-, Firmen- und Steuer-Daten */}
        <View style={styles.footer}>
          <Text style={styles.footerTax}>
            {contact.businessName} ({contact.ownerName}) · {contact.street}, {contact.zip}{" "}
            {contact.city}, {contact.country} · {contact.phone} · {contact.email}
          </Text>
          <Text style={[styles.footerTax, { marginTop: 2 }]}>
            UID {contact.uid} · StNr. {contact.taxNumber} · Behörde:{" "}
            {(contact as { authority?: string }).authority} · Enthält {vatRatePct} % USt gemäß
            § 10 Abs. 3 UStG (Beherbergung).
          </Text>
          <View style={styles.footerLegal}>
            <Text style={styles.footerLegalText}>
              Stornobedingungen: bis 60 Tage vor Anreise kostenfrei · 59–30 Tage: Anzahlung
              einbehalten · ab 30 Tage: Gesamtbetrag (außer bei nachgewiesener Reiseunfähigkeit).
            </Text>
          </View>

          <View style={styles.footerBottom}>
            <Text style={styles.footerPage}>
              {docLabel} {booking.invoice_number} · {invoiceDate}
            </Text>
            <Text style={styles.footerPage}>
              Aufbewahrungspflicht 7 Jahre (§ 132 BAO)
            </Text>
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

/** Baut einen GiroCode/EPC-QR (SEPA-Überweisung) als PNG-data-URL. */
async function buildPaymentQr(opts: {
  name: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
}): Promise<string | null> {
  const iban = (opts.iban || "").replace(/\s+/g, "");
  if (!iban || !(opts.amount > 0)) return null;
  // EPC069-12 (GiroCode): von Banking-Apps scannbar.
  const lines = [
    "BCD",
    "002",
    "1",
    "SCT",
    (opts.bic || "").trim(),
    (opts.name || "").slice(0, 70),
    iban,
    `EUR${opts.amount.toFixed(2)}`,
    "",
    "",
    opts.reference.slice(0, 140),
    "",
  ];
  try {
    return await QRCode.toDataURL(lines.join("\n"), {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 240,
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const documentType = data.documentType ?? "invoice";
  let qrDataUrl: string | null = null;
  // QR nur auf regulären, noch offenen Rechnungen (nicht auf Storno/Korrektur).
  if (documentType === "invoice") {
    const total = data.snapshot?.totals.total ?? data.booking.total_price;
    const paid = (data.payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = Math.round((total - paid) * 100) / 100;
    if (outstanding > 0.01) {
      const bank = data.snapshot?.bank_details ?? data.bankDetails;
      qrDataUrl = await buildPaymentQr({
        name: bank.account_holder,
        iban: bank.iban,
        bic: bank.bic,
        amount: outstanding,
        reference: `FR-${data.booking.id.substring(0, 8).toUpperCase()}`,
      });
    }
  }
  return (await renderToBuffer(<InvoicePdf data={{ ...data, qrDataUrl }} />)) as Buffer;
}
