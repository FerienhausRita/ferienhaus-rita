/* ── Smoobu API Types ── */

export interface SmoobuApartment {
  id: number;
  name: string;
}

export interface SmoobuApartmentDetail extends SmoobuApartment {
  location?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timeZone?: string;
  currency?: string;
  rooms?: { maxOccupancy?: number };
  price?: { minimal?: number; maximal?: number };
  type?: { id: number; name: string };
}

export interface SmoobuChannel {
  id: number;
  channel_id: number;
  name: string; // e.g. "Booking.com", "Airbnb", "Direct booking"
}

export interface SmoobuReservation {
  id: number;
  "reference-id": string | null;
  type: "reservation" | "modification of booking" | "cancellation";
  arrival: string; // YYYY-MM-DD
  departure: string;
  "created-at": string;
  modifiedAt: string;
  apartment: { id: number; name: string };
  channel: SmoobuChannel;
  "guest-name": string;
  firstname: string;
  lastname: string;
  email: string | null;
  phone: string | null;
  adults: number;
  children: number;
  "check-in": string; // e.g. "16:00"
  "check-out": string;
  notice: string;
  "assistant-notice": string;
  price: number;
  "price-paid": "Yes" | "No";
  prepayment: number;
  "prepayment-paid": "Yes" | "No";
  deposit: number | null;
  "deposit-paid": "Yes" | "No";
  language: string;
  "is-blocked-booking": boolean;
  guestId: number;
}

export interface SmoobuReservationsResponse {
  page_count: number;
  page_size: number;
  total_items: number;
  page: number;
  bookings: SmoobuReservation[];
}

export interface SmoobuGuest {
  id: number;
  firstName: string;
  lastName: string;
  companyName?: string;
  emails?: string[];
  telephoneNumbers?: string[];
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
}

export interface CreateReservationPayload {
  arrivalDate: string;
  departureDate: string;
  channelId: number;
  apartmentId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: { street: string; postalCode: string; location: string; country: string };
  country?: string;
  adults?: number;
  children?: number;
  price?: number;
  priceStatus?: number; // 1=yes, 0=no
  deposit?: number;
  depositStatus?: number;
  language?: string;
  notice?: string;
}

export interface UpdateReservationPayload {
  arrivalTime?: string;
  departureTime?: string;
  price?: number;
  priceStatus?: number;
  prepayment?: number;
  prepaymentStatus?: number;
  deposit?: number;
  depositStatus?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notice?: string;
  adults?: number;
  children?: number;
}

export interface SmoobuConfig {
  enabled: boolean;
  apartment_mapping: Record<string, number>; // local slug → Smoobu ID
  website_channel_id?: number; // Smoobu channel ID for "Website" / direct bookings
  pricing_source: "local" | "smoobu";
  last_sync_at: string | null;
}

export interface SmoobuRateDay {
  price: number;
  min_length_of_stay: number;
  available: number; // 0 or 1
}

export interface SmoobuRatesResponse {
  data: Record<string, Record<string, SmoobuRateDay>>; // apartmentId → date → rate
}
