/**
 * Zentrale Kontaktdaten – bei Bedarf hier aktualisieren.
 * Wird in Footer, Kontakt, Impressum und Datenschutz importiert.
 */

export const contact = {
  // Gastgeber
  ownerName: "Berger & Berger GbR",
  ownerRepresentatives: "Manuel Berger und Nadja Berger",
  businessName: "Ferienhaus Rita",

  // Adresse
  street: "Großdorf 83",
  zip: "9981",
  city: "Kals am Großglockner",
  region: "Osttirol",
  country: "Österreich",

  // Kontakt
  phone: "+49 152 22967385",
  phoneHref: "tel:+4915222967385",
  email: "info@ferienhaus-rita-kals.at",
  emailHref: "mailto:info@ferienhaus-rita-kals.at",

  // Rechtliches
  taxNumber: "83 381/5913",
  uid: "ATU83130504",
  authority: "Bezirkshauptmannschaft Lienz",
} as const;

export type ContactData = typeof contact;
