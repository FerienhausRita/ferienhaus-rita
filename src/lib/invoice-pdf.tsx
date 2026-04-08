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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: string;
  apartment_id: string;
  check_in: string; // ISO date string
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
  dogs: number;
  total_price: number;
  invoice_number: string; // e.g. "FR-2026-0001"
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
}

// ---------------------------------------------------------------------------
// Local formatting helpers (no Intl dependency)
// ---------------------------------------------------------------------------

/** Format a number as EUR with comma decimal separator: "1.234,56 EUR" */
function fmtCurrency(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole, decimals] = fixed.split(".");
  // Add thousands dots
  const withDots = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = amount < 0 ? "-" : "";
  return `${sign}${withDots},${decimals} \u20AC`;
}

/** Format an ISO date string or Date as dd.mm.yyyy */
function fmtDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

const LOCAL_TAX_PER_PERSON_PER_NIGHT = 2.5;
const VAT_RATE = 0.1;

function calculateNights(checkIn: string, checkOut: string): number {
  const diff =
    new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const GOLD = "#c8a96e";
const DARK = "#1c1917";
const GRAY = "#57534e";
const LIGHT_GRAY = "#e7e5e4";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // Header
  headerContainer: {
    marginBottom: 30,
  },
  businessName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 2,
  },
  headerLine: {
    height: 2,
    backgroundColor: GOLD,
    marginTop: 6,
    marginBottom: 8,
  },
  headerDetail: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },

  // Title
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 9,
    color: GRAY,
    lineHeight: 1.6,
  },

  // Guest address
  addressBlock: {
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 7,
    color: GRAY,
    marginBottom: 3,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  addressText: {
    fontSize: 9,
    lineHeight: 1.6,
  },

  // Service period
  servicePeriod: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#fafaf9",
    borderRadius: 3,
  },
  servicePeriodLabel: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 2,
  },
  servicePeriodValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },

  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_GRAY,
  },
  colDesc: {
    flex: 1,
  },
  colQty: {
    width: 80,
    textAlign: "right",
  },
  colUnit: {
    width: 80,
    textAlign: "right",
  },
  colTotal: {
    width: 80,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tableCellText: {
    fontSize: 9,
  },

  // Totals
  totalsContainer: {
    alignItems: "flex-end",
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 250,
    paddingVertical: 3,
  },
  totalLabel: {
    flex: 1,
    fontSize: 9,
    color: GRAY,
  },
  totalValue: {
    width: 90,
    textAlign: "right",
    fontSize: 9,
  },
  totalDivider: {
    width: 250,
    height: 1,
    backgroundColor: DARK,
    marginVertical: 4,
  },
  grandTotalLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    width: 90,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },

  // Payment
  paymentContainer: {
    marginBottom: 30,
    padding: 12,
    backgroundColor: "#fafaf9",
    borderRadius: 3,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  paymentLabel: {
    width: 110,
    fontSize: 8,
    color: GRAY,
  },
  paymentValue: {
    fontSize: 9,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
  },
  footerThank: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: GOLD,
    marginBottom: 6,
  },
  footerDetail: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.5,
  },
});

// ---------------------------------------------------------------------------
// Invoice PDF Component
// ---------------------------------------------------------------------------

function InvoicePdf({ data }: { data: InvoiceData }) {
  const { booking, apartment, bankDetails, contact } = data;

  const nights = calculateNights(booking.check_in, booking.check_out);
  const totalGuests = booking.adults + booking.children;
  const extraGuests = Math.max(0, totalGuests - apartment.baseGuests);

  // Line items
  const basePricePerNight = apartment.basePrice;
  const accommodationTotal = basePricePerNight * nights;

  const extraGuestsTotal = extraGuests * apartment.extraPersonPrice * nights;
  const dogsTotal = booking.dogs * apartment.dogFee * nights;
  const cleaningFee = apartment.cleaningFee;
  const localTaxTotal =
    booking.adults * nights * LOCAL_TAX_PER_PERSON_PER_NIGHT;

  // VAT: all prices are gross (incl. 10% VAT), except Ortstaxe
  const vatLiableGross = booking.total_price - localTaxTotal;
  const vatAmount =
    Math.round(((vatLiableGross / (1 + VAT_RATE)) * VAT_RATE) * 100) / 100;

  const invoiceDate = fmtDate(new Date());

  // Verwendungszweck: FR-{first 8 chars of booking id}
  const paymentRef = `FR-${booking.id.substring(0, 8)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.businessName}>{contact.businessName}</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerDetail}>
            {contact.ownerName} | {contact.street} | {contact.zip}{" "}
            {contact.city} | {contact.country}
          </Text>
          <Text style={styles.headerDetail}>
            Tel: {contact.phone} | E-Mail: {contact.email}
            {contact.uid ? ` | UID: ${contact.uid}` : ""}
          </Text>
        </View>

        {/* Title + Invoice meta */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>RECHNUNG</Text>
          <Text style={styles.invoiceMeta}>
            Rechnungsnummer: {booking.invoice_number}
          </Text>
          <Text style={styles.invoiceMeta}>
            Rechnungsdatum: {invoiceDate}
          </Text>
        </View>

        {/* Guest address */}
        <View style={styles.addressBlock}>
          <Text style={styles.addressLabel}>Rechnungsempfänger</Text>
          <Text style={styles.addressText}>
            {booking.first_name} {booking.last_name}
          </Text>
          <Text style={styles.addressText}>{booking.street}</Text>
          <Text style={styles.addressText}>
            {booking.zip} {booking.city}
          </Text>
          <Text style={styles.addressText}>{booking.country}</Text>
        </View>

        {/* Service period */}
        <View style={styles.servicePeriod}>
          <Text style={styles.servicePeriodLabel}>Leistungszeitraum</Text>
          <Text style={styles.servicePeriodValue}>
            {fmtDate(booking.check_in)} bis {fmtDate(booking.check_out)} (
            {nights} {nights === 1 ? "Nacht" : "Nächte"})
          </Text>
        </View>

        {/* Itemized table */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}>
              <Text style={styles.tableHeaderText}>Beschreibung</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.tableHeaderText}>Menge</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.tableHeaderText}>Einzelpreis</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableHeaderText}>Betrag</Text>
            </View>
          </View>

          {/* Accommodation */}
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.tableCellText}>
                Unterkunft {apartment.name}
              </Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.tableCellText}>
                {nights} {nights === 1 ? "Nacht" : "Nächte"}
              </Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(basePricePerNight)}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(accommodationTotal)}
              </Text>
            </View>
          </View>

          {/* Extra persons */}
          {extraGuests > 0 && (
            <View style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.tableCellText}>Zusatzpersonen</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.tableCellText}>
                  {extraGuests} Pers. x {nights} N.
                </Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={styles.tableCellText}>
                  {fmtCurrency(apartment.extraPersonPrice)}
                </Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={styles.tableCellText}>
                  {fmtCurrency(extraGuestsTotal)}
                </Text>
              </View>
            </View>
          )}

          {/* Dogs */}
          {booking.dogs > 0 && (
            <View style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.tableCellText}>
                  {booking.dogs === 1 ? "Hund" : "Hunde"}
                </Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.tableCellText}>
                  {booking.dogs} x {nights} N.
                </Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={styles.tableCellText}>
                  {fmtCurrency(apartment.dogFee)}
                </Text>
              </View>
              <View style={styles.colTotal}>
                <Text style={styles.tableCellText}>
                  {fmtCurrency(dogsTotal)}
                </Text>
              </View>
            </View>
          )}

          {/* Cleaning fee */}
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.tableCellText}>Endreinigung</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.tableCellText}>1</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(cleaningFee)}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(cleaningFee)}
              </Text>
            </View>
          </View>

          {/* Local tax */}
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.tableCellText}>Ortstaxe</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.tableCellText}>
                {booking.adults} Pers. x {nights} N.
              </Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(LOCAL_TAX_PER_PERSON_PER_NIGHT)}
              </Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.tableCellText}>
                {fmtCurrency(localTaxTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Zwischensumme</Text>
            <Text style={styles.totalValue}>
              {fmtCurrency(booking.total_price)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Davon 10% USt. (auf Beherbergungsleistungen)
            </Text>
            <Text style={styles.totalValue}>{fmtCurrency(vatAmount)}</Text>
          </View>
          <Text style={{ fontSize: 7, color: GRAY, marginBottom: 2, textAlign: "right" as const, width: 250 }}>
            Ortstaxe ist eine öffentliche Abgabe und nicht umsatzsteuerpflichtig.
          </Text>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Gesamtbetrag</Text>
            <Text style={styles.grandTotalValue}>
              {fmtCurrency(booking.total_price)}
            </Text>
          </View>
        </View>

        {/* Payment info */}
        <View style={styles.paymentContainer}>
          <Text style={styles.paymentTitle}>Zahlungsinformationen</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Kontoinhaber:</Text>
            <Text style={styles.paymentValue}>
              {bankDetails.account_holder}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>IBAN:</Text>
            <Text style={styles.paymentValue}>{bankDetails.iban}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>BIC:</Text>
            <Text style={styles.paymentValue}>{bankDetails.bic}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Bank:</Text>
            <Text style={styles.paymentValue}>{bankDetails.bank_name}</Text>
          </View>
          <View style={[styles.paymentRow, { marginTop: 6 }]}>
            <Text style={styles.paymentLabel}>Verwendungszweck:</Text>
            <Text style={[styles.paymentValue, { fontFamily: "Helvetica-Bold" }]}>
              {paymentRef}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerThank}>
            Vielen Dank für Ihren Aufenthalt!
          </Text>
          <Text style={styles.footerDetail}>
            {contact.businessName} | {contact.ownerName} | {contact.street},{" "}
            {contact.zip} {contact.city} | {contact.country}
          </Text>
          <Text style={styles.footerDetail}>
            {contact.phone} | {contact.email}
            {contact.uid ? ` | UID: ${contact.uid}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateInvoicePdf(
  data: InvoiceData
): Promise<Buffer> {
  return (await renderToBuffer(
    <InvoicePdf data={data} />
  )) as Buffer;
}
