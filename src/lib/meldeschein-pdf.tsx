import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import { contact } from "@/data/contact";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MeldescheinPdfData {
  // Primary guest
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  id_type: string;
  id_number: string;
  street: string;
  zip: string;
  city: string;
  country: string;

  // Companions
  companions: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    nationality: string;
  }[];

  // Stay
  arrival_date: string;
  departure_date: string;

  // Booking context
  apartment_name: string;
  booking_ref: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NATIONALITY_LABELS: Record<string, string> = {
  AT: "Österreich", DE: "Deutschland", CH: "Schweiz", IT: "Italien",
  NL: "Niederlande", CZ: "Tschechien", PL: "Polen", HU: "Ungarn",
  SK: "Slowakei", SI: "Slowenien", HR: "Kroatien", GB: "Großbritannien",
  FR: "Frankreich", BE: "Belgien", DK: "Dänemark", SE: "Schweden", US: "USA",
};

const ID_TYPE_LABELS: Record<string, string> = {
  passport: "Reisepass",
  id_card: "Personalausweis",
  drivers_license: "Führerschein",
};

function fmtDate(input: string): string {
  const d = new Date(input + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const GOLD = "#c8a96e";
const DARK = "#1c1917";
const GRAY = "#57534e";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  headerContainer: {
    marginBottom: 24,
  },
  businessName: {
    fontSize: 18,
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
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: GRAY,
  },
  value: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  companionBox: {
    backgroundColor: "#fafaf9",
    padding: 10,
    borderRadius: 3,
    marginBottom: 8,
  },
  companionTitle: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  signatureLine: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#d6d3d1",
    paddingTop: 6,
    width: 250,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
  },
  footerDetail: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.5,
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function MeldescheinPdf({ data }: { data: MeldescheinPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.businessName}>{contact.businessName}</Text>
          <View style={styles.headerLine} />
          <Text style={styles.headerDetail}>
            {contact.ownerName} | {contact.street} | {contact.zip} {contact.city} | {contact.country}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>GÄSTEMELDESCHEIN</Text>
        <Text style={styles.subtitle}>
          gem. österr. Meldegesetz | Buchung {data.booking_ref} | {data.apartment_name}
        </Text>

        {/* Stay period */}
        <Text style={styles.sectionTitle}>Aufenthalt</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Anreise:</Text>
          <Text style={styles.value}>{fmtDate(data.arrival_date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Abreise:</Text>
          <Text style={styles.value}>{fmtDate(data.departure_date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Unterkunft:</Text>
          <Text style={styles.value}>{data.apartment_name}</Text>
        </View>

        {/* Primary guest */}
        <Text style={styles.sectionTitle}>Hauptgast</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.first_name} {data.last_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Geburtsdatum:</Text>
          <Text style={styles.value}>{fmtDate(data.date_of_birth)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Staatsangehörigkeit:</Text>
          <Text style={styles.value}>{NATIONALITY_LABELS[data.nationality] || data.nationality}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ausweisdokument:</Text>
          <Text style={styles.value}>
            {ID_TYPE_LABELS[data.id_type] || data.id_type}: {data.id_number}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Adresse:</Text>
          <Text style={styles.value}>
            {data.street}, {data.zip} {data.city}, {NATIONALITY_LABELS[data.country] || data.country}
          </Text>
        </View>

        {/* Companions */}
        {data.companions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Mitreisende ({data.companions.length})
            </Text>
            {data.companions.map((c, i) => (
              <View key={i} style={styles.companionBox}>
                <Text style={styles.companionTitle}>Person {i + 2}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>{c.first_name} {c.last_name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Geburtsdatum:</Text>
                  <Text style={styles.value}>{fmtDate(c.date_of_birth)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Staatsangehörigkeit:</Text>
                  <Text style={styles.value}>{NATIONALITY_LABELS[c.nationality] || c.nationality}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Signature */}
        <View style={styles.signatureLine}>
          <Text style={styles.signatureLabel}>
            Datum, Unterschrift des Unterkunftgebers
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerDetail}>
            {contact.businessName} | {contact.street}, {contact.zip} {contact.city} | {contact.country}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateMeldescheinPdf(
  data: MeldescheinPdfData
): Promise<Buffer> {
  return (await renderToBuffer(<MeldescheinPdf data={data} />)) as Buffer;
}
