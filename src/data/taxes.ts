/**
 * Ortstaxe / Kurtaxe für Kals am Großglockner.
 *
 * Stand: 2026. Wird vom Land Tirol festgelegt.
 * Kinder unter dem Freibetragsalter sind befreit.
 */

export const localTax = {
  /** Tax per person per night in EUR */
  perPersonPerNight: 2.5,
  /** Children below this age are exempt */
  exemptAge: 15,
  /** Label displayed to guests */
  label: "Ortstaxe",
  /** Description */
  description: "Ortstaxe der Gemeinde Kals am Großglockner",
} as const;

export type LocalTaxConfig = typeof localTax;
