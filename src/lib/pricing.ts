import { Apartment } from "@/data/apartments";
import { getSeasonForDate, SeasonType } from "@/data/seasons";
import { localTax } from "@/data/taxes";
import {
  DiscountCode,
  calculateDiscountAmount,
} from "@/data/discounts";

export interface BookingParams {
  apartment: Apartment;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  dogs: number;
  discount?: DiscountCode | null;
}

export interface SeasonBreakdownEntry {
  type: SeasonType;
  label: string;
  nights: number;
  pricePerNight: number;
  total: number;
}

export interface PriceBreakdown {
  nights: number;
  /** Weighted average base price per night (for display) */
  basePrice: number;
  basePriceTotal: number;
  /** Day-by-day season breakdown */
  seasonBreakdown: SeasonBreakdownEntry[];
  extraGuests: number;
  extraGuestsPricePerNight: number;
  extraGuestsTotal: number;
  dogsPricePerNight: number;
  dogsTotal: number;
  cleaningFee: number;
  /** Ortstaxe total (adults only — children under 15 exempt) */
  localTaxTotal: number;
  /** Subtotal before discount */
  subtotal: number;
  /** Discount applied */
  discountLabel: string | null;
  discountAmount: number;
  total: number;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculatePrice(params: BookingParams): PriceBreakdown {
  const { apartment, checkIn, checkOut, adults, children, dogs, discount } =
    params;
  const nights = calculateNights(checkIn, checkOut);
  const totalGuests = adults + children;
  const extraGuests = Math.max(0, totalGuests - apartment.baseGuests);

  // Day-by-day seasonal price calculation
  const seasonMap = new Map<
    SeasonType,
    { label: string; nights: number; pricePerNight: number; total: number }
  >();

  let basePriceTotal = 0;
  const current = new Date(checkIn);

  for (let i = 0; i < nights; i++) {
    const season = getSeasonForDate(current);
    const nightPrice = Math.round(apartment.basePrice * season.multiplier * 100) / 100;

    const existing = seasonMap.get(season.type);
    if (existing) {
      existing.nights += 1;
      existing.total += nightPrice;
    } else {
      seasonMap.set(season.type, {
        label: season.label,
        nights: 1,
        pricePerNight: nightPrice,
        total: nightPrice,
      });
    }

    basePriceTotal += nightPrice;
    current.setDate(current.getDate() + 1);
  }

  const seasonBreakdown: SeasonBreakdownEntry[] = Array.from(
    seasonMap.entries()
  ).map(([type, entry]) => ({
    type,
    label: entry.label,
    nights: entry.nights,
    pricePerNight: entry.pricePerNight,
    total: Math.round(entry.total * 100) / 100,
  }));

  // Weighted average base price (for backward compatibility / display)
  const basePrice =
    nights > 0 ? Math.round((basePriceTotal / nights) * 100) / 100 : apartment.basePrice;

  // Extra guests & dogs (flat rate, not seasonal)
  const extraGuestsPricePerNight = extraGuests * apartment.extraPersonPrice;
  const extraGuestsTotal = extraGuestsPricePerNight * nights;

  const dogsPricePerNight = dogs * apartment.dogFee;
  const dogsTotal = dogsPricePerNight * nights;

  const cleaningFee = apartment.cleaningFee;

  // Ortstaxe: adults only (children under 15 exempt)
  const localTaxTotal = adults * nights * localTax.perPersonPerNight;

  const subtotal =
    basePriceTotal + extraGuestsTotal + dogsTotal + cleaningFee + localTaxTotal;

  // Discount
  let discountAmount = 0;
  let discountLabel: string | null = null;
  if (discount) {
    const discountableSubtotal = basePriceTotal + extraGuestsTotal + dogsTotal;
    discountAmount = calculateDiscountAmount(discount, discountableSubtotal);
    if (discountAmount > 0) {
      discountLabel = discount.label;
    }
  }

  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  return {
    nights,
    basePrice,
    basePriceTotal: Math.round(basePriceTotal * 100) / 100,
    seasonBreakdown,
    extraGuests,
    extraGuestsPricePerNight,
    extraGuestsTotal,
    dogsPricePerNight,
    dogsTotal,
    cleaningFee,
    localTaxTotal,
    subtotal: Math.round(subtotal * 100) / 100,
    discountLabel,
    discountAmount,
    total,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
