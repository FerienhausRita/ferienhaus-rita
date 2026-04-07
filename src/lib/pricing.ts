import { Apartment } from "@/data/apartments";

export interface BookingParams {
  apartment: Apartment;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  dogs: number;
}

export interface PriceBreakdown {
  nights: number;
  basePrice: number;
  basePriceTotal: number;
  extraGuests: number;
  extraGuestsPricePerNight: number;
  extraGuestsTotal: number;
  dogsPricePerNight: number;
  dogsTotal: number;
  cleaningFee: number;
  subtotal: number;
  // Future: localTax, seasonalSurcharge, discounts, addOns
  total: number;
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculatePrice(params: BookingParams): PriceBreakdown {
  const { apartment, checkIn, checkOut, adults, children, dogs } = params;
  const nights = calculateNights(checkIn, checkOut);
  const totalGuests = adults + children;
  const extraGuests = Math.max(0, totalGuests - apartment.baseGuests);

  const basePrice = apartment.basePrice;
  const basePriceTotal = basePrice * nights;

  const extraGuestsPricePerNight = extraGuests * apartment.extraPersonPrice;
  const extraGuestsTotal = extraGuestsPricePerNight * nights;

  const dogsPricePerNight = dogs * apartment.dogFee;
  const dogsTotal = dogsPricePerNight * nights;

  const cleaningFee = apartment.cleaningFee;

  const subtotal = basePriceTotal + extraGuestsTotal + dogsTotal + cleaningFee;

  // Future extension points:
  // const localTax = calculateLocalTax(nights, totalGuests);
  // const seasonalSurcharge = calculateSeasonalSurcharge(checkIn, checkOut, basePrice);
  // const discount = calculateDiscount(nights, subtotal);

  const total = subtotal;

  return {
    nights,
    basePrice,
    basePriceTotal,
    extraGuests,
    extraGuestsPricePerNight,
    extraGuestsTotal,
    dogsPricePerNight,
    dogsTotal,
    cleaningFee,
    subtotal,
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
