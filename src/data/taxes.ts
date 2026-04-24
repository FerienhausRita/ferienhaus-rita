/**
 * Ortstaxe / Kurtaxe für Kals am Großglockner.
 *
 * Stand: 2026. Wird vom Land Tirol festgelegt.
 * Kinder unter dem Freibetragsalter sind befreit.
 */

export const localTax = {
  /** Tax per person per night in EUR */
  perPersonPerNight: 2.60,
  /** Children below this age are exempt */
  exemptAge: 15,
  /** Label displayed to guests */
  label: "Kurtaxe",
  /** Description */
  description: "Kurtaxe der Gemeinde Kals am Großglockner",
  /**
   * Ist die Kurtaxe im Buchungs-Gesamtpreis enthalten?
   * - true: Kurtaxe wird in total_price eingerechnet (Altbestand)
   * - false: Kurtaxe wird vor Ort separat abgerechnet, Hinweistext bleibt
   */
  includedInTotal: false,
} as const;

export type LocalTaxConfig = typeof localTax;

/**
 * Umsatzsteuer (USt / MwSt) für Beherbergung in Österreich.
 *
 * Ermäßigter Steuersatz von 10 % gemäß § 10 Abs. 2 Z 4 UStG.
 * Gilt für: Übernachtung, Endreinigung, Hundezuschlag.
 * Gilt NICHT für: Ortstaxe (öffentliche Abgabe, kein Entgelt).
 *
 * Preise sind BRUTTO (inkl. MwSt) — die MwSt wird herausgerechnet.
 */
export const vat = {
  /** VAT rate as a decimal (10 %) */
  rate: 0.10,
  /** Label displayed to guests */
  label: "MwSt",
  /** Description */
  description: "Umsatzsteuer für Beherbergung (ermäßigter Satz)",
} as const;

export type VatConfig = typeof vat;
