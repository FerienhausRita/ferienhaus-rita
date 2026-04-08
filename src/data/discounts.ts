/**
 * Rabattcode-System.
 *
 * Codes können prozentual oder als Fixbetrag definiert werden.
 * Optional: Gültigkeitszeitraum und Mindestbuchungswert.
 */

export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  code: string;
  type: DiscountType;
  /** Percentage (0–100) or fixed EUR amount */
  value: number;
  /** Minimum booking subtotal to apply (before cleaning fee) */
  minSubtotal?: number;
  /** Optional: valid from date (ISO string) */
  validFrom?: string;
  /** Optional: valid until date (ISO string) */
  validUntil?: string;
  /** Description shown to guest */
  label: string;
  /** Max uses (0 = unlimited) */
  maxUses: number;
}

/**
 * Active discount codes.
 * In production, these would come from the database.
 */
export const discountCodes: DiscountCode[] = [
  {
    code: "WILLKOMMEN10",
    type: "percent",
    value: 10,
    label: "10% Willkommensrabatt",
    maxUses: 0,
  },
  {
    code: "FRUEHBUCHER",
    type: "percent",
    value: 5,
    label: "5% Frühbucherrabatt",
    minSubtotal: 500,
    maxUses: 0,
  },
];

/**
 * Find and validate a discount code.
 * Returns the discount or null if invalid/expired.
 */
export function validateDiscountCode(
  code: string,
  bookingDate?: Date
): DiscountCode | null {
  const normalized = code.trim().toUpperCase();
  const discount = discountCodes.find((d) => d.code === normalized);
  if (!discount) return null;

  const now = bookingDate || new Date();
  if (discount.validFrom && new Date(discount.validFrom) > now) return null;
  if (discount.validUntil && new Date(discount.validUntil) < now) return null;

  return discount;
}

/**
 * Calculate the discount amount given a subtotal.
 */
export function calculateDiscountAmount(
  discount: DiscountCode,
  subtotal: number
): number {
  if (discount.minSubtotal && subtotal < discount.minSubtotal) return 0;

  if (discount.type === "percent") {
    return Math.round((subtotal * discount.value) / 100 * 100) / 100;
  }
  return Math.min(discount.value, subtotal);
}
