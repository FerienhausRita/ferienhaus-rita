import { createServerClient } from "@/lib/supabase/server";
import { createSmoobuClient, SmoobuApiError } from "./client";
import { getSmoobuConfig, getLocalApartmentSlug, getSmoobuApartmentId } from "./mapping";
import type { SmoobuReservation } from "./types";

// ── Channel name mapping ──

function getChannelName(channel: SmoobuReservation["channel"]): string {
  const name = channel?.name ?? "";
  // Smoobu channel names: "Booking.com", "Airbnb", "Direct booking", etc.
  if (name.toLowerCase().includes("booking")) return "Booking.com";
  if (name.toLowerCase().includes("airbnb")) return "Airbnb";
  if (name.toLowerCase().includes("direct")) return "Website";
  return name || "Extern";
}

// ── Pull: Smoobu → Local DB ──

export async function syncReservationFromSmoobu(
  reservation: SmoobuReservation,
): Promise<{ action: "created" | "updated" | "skipped"; bookingId?: string }> {
  const supabase = createServerClient();

  // Skip blocked bookings (maintenance etc.)
  if (reservation["is-blocked-booking"]) {
    return { action: "skipped" };
  }

  // Find local apartment
  const localSlug = await getLocalApartmentSlug(reservation.apartment.id);
  if (!localSlug) {
    console.warn(`No local apartment for Smoobu ID ${reservation.apartment.id}`);
    return { action: "skipped" };
  }

  // Check if we already have this reservation
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, status, smoobu_sync_status")
    .eq("smoobu_reservation_id", reservation.id)
    .single();

  const isCancellation = reservation.type === "cancellation";
  const channelName = getChannelName(reservation.channel);

  // Map payment status
  const paymentStatus = reservation["price-paid"] === "Yes"
    ? "paid"
    : reservation["prepayment-paid"] === "Yes"
      ? "deposit_paid"
      : "unpaid";

  if (existing) {
    // Update existing booking
    if (isCancellation && existing.status !== "cancelled") {
      // Cancel the booking
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          smoobu_sync_status: "synced",
        })
        .eq("id", existing.id);

      // Skip pending emails
      await supabase
        .from("email_schedule")
        .update({ status: "skipped" })
        .eq("booking_id", existing.id)
        .eq("status", "pending");

      await logSync("pull", "cancelReservation", existing.id, reservation.id, "success");
      return { action: "updated", bookingId: existing.id };
    }

    if (!isCancellation) {
      // Update guest data, dates, price
      await supabase
        .from("bookings")
        .update({
          check_in: reservation.arrival,
          check_out: reservation.departure,
          first_name: reservation.firstname || reservation["guest-name"]?.split(" ")[0] || "",
          last_name: reservation.lastname || reservation["guest-name"]?.split(" ").slice(1).join(" ") || "",
          email: reservation.email || undefined,
          phone: reservation.phone || undefined,
          adults: reservation.adults,
          children: reservation.children,
          total_price: reservation.price,
          payment_status: paymentStatus,
          source_channel: channelName,
          smoobu_sync_status: "synced",
        })
        .eq("id", existing.id);

      await logSync("pull", "updateReservation", existing.id, reservation.id, "success");
      return { action: "updated", bookingId: existing.id };
    }

    return { action: "skipped" };
  }

  // Don't create new bookings for cancellations
  if (isCancellation) {
    return { action: "skipped" };
  }

  // Calculate nights
  const arrival = new Date(reservation.arrival);
  const departure = new Date(reservation.departure);
  const nights = Math.round((departure.getTime() - arrival.getTime()) / 86400000);

  // Create new booking from external source
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      apartment_id: localSlug,
      check_in: reservation.arrival,
      check_out: reservation.departure,
      first_name: reservation.firstname || reservation["guest-name"]?.split(" ")[0] || "Gast",
      last_name: reservation.lastname || reservation["guest-name"]?.split(" ").slice(1).join(" ") || "",
      email: reservation.email || "",
      phone: reservation.phone || "",
      adults: reservation.adults || 1,
      children: reservation.children || 0,
      dogs: 0,
      nights,
      price_per_night: nights > 0 ? Math.round((reservation.price / nights) * 100) / 100 : 0,
      total_price: reservation.price,
      cleaning_fee: 0,
      extra_guests_total: 0,
      dogs_total: 0,
      local_tax_total: 0,
      discount_amount: 0,
      status: "confirmed",
      payment_status: paymentStatus,
      source: "external",
      source_channel: channelName,
      smoobu_reservation_id: reservation.id,
      smoobu_sync_status: "synced",
    })
    .select("id")
    .single();

  if (error || !booking) {
    console.error("Failed to create booking from Smoobu:", error);
    await logSync("pull", "newReservation", null, reservation.id, "failed", error?.message);
    return { action: "skipped" };
  }

  // Upsert guest
  if (reservation.email) {
    try {
      await supabase.from("guests").upsert(
        {
          email: reservation.email,
          first_name: reservation.firstname || "",
          last_name: reservation.lastname || "",
          phone: reservation.phone || "",
          smoobu_guest_id: reservation.guestId,
        },
        { onConflict: "email" },
      );
    } catch {
      // Non-critical
    }
  }

  await logSync("pull", "newReservation", booking.id, reservation.id, "success");
  return { action: "created", bookingId: booking.id };
}

// ── Push: Local DB → Smoobu ──

export async function pushBookingToSmoobu(bookingId: string): Promise<boolean> {
  const smoobu = createSmoobuClient();
  if (!smoobu) return false;

  const config = await getSmoobuConfig();
  if (!config.enabled) return false;

  const supabase = createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (!booking) return false;

  const smoobuApartmentId = await getSmoobuApartmentId(booking.apartment_id);
  if (!smoobuApartmentId) return false;

  try {
    // If already pushed, update instead
    if (booking.smoobu_reservation_id) {
      await smoobu.updateReservation(booking.smoobu_reservation_id, {
        price: booking.total_price,
        priceStatus: booking.payment_status === "paid" ? 1 : 0,
        guestName: `${booking.first_name} ${booking.last_name}`,
        guestEmail: booking.email,
        guestPhone: booking.phone,
        adults: booking.adults,
        children: booking.children,
        notice: booking.notes || "",
      });

      await supabase
        .from("bookings")
        .update({ smoobu_sync_status: "synced" })
        .eq("id", bookingId);

      await logSync("push", "updateReservation", bookingId, booking.smoobu_reservation_id, "success");
      return true;
    }

    // Create new reservation in Smoobu
    // channelId: "Website" channel from Smoobu account
    const websiteChannelId = config.website_channel_id ?? 6337157;

    const result = await smoobu.createReservation({
      arrivalDate: booking.check_in,
      departureDate: booking.check_out,
      channelId: websiteChannelId,
      apartmentId: smoobuApartmentId,
      firstName: booking.first_name || "Gast",
      lastName: booking.last_name || "-",
      email: booking.email || "",
      phone: booking.phone || "+43000000000",
      address: {
        street: booking.street || "-",
        postalCode: booking.zip || "-",
        location: booking.city || "-",
        country: booking.country || "AT",
      },
      country: booking.country || "AT",
      adults: booking.adults || 1,
      children: booking.children || 0,
      price: booking.total_price,
      priceStatus: booking.payment_status === "paid" ? 1 : 0,
      language: "de",
      notice: booking.notes || "",
    });

    await supabase
      .from("bookings")
      .update({
        smoobu_reservation_id: result.id,
        smoobu_sync_status: "synced",
        source_channel: "Website",
      })
      .eq("id", bookingId);

    await logSync("push", "newReservation", bookingId, result.id, "success");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Smoobu push failed for ${bookingId}:`, msg);

    await supabase
      .from("bookings")
      .update({ smoobu_sync_status: "failed" })
      .eq("id", bookingId);

    await logSync("push", "pushFailed", bookingId, null, "failed", msg);
    return false;
  }
}

// ── Cancel in Smoobu ──

export async function cancelBookingInSmoobu(bookingId: string): Promise<boolean> {
  const smoobu = createSmoobuClient();
  if (!smoobu) return false;

  const config = await getSmoobuConfig();
  if (!config.enabled) return false;

  const supabase = createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("smoobu_reservation_id")
    .eq("id", bookingId)
    .single();

  if (!booking?.smoobu_reservation_id) return false;

  try {
    await smoobu.cancelReservation(booking.smoobu_reservation_id);
    await logSync("push", "cancelReservation", bookingId, booking.smoobu_reservation_id, "success");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logSync("push", "cancelFailed", bookingId, booking.smoobu_reservation_id, "failed", msg);
    return false;
  }
}

// ── Sync log helper ──

async function logSync(
  direction: "push" | "pull",
  eventType: string,
  bookingId: string | null,
  smoobuReservationId: number | null,
  status: "success" | "failed",
  errorMessage?: string,
): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from("smoobu_sync_log").insert({
      direction,
      event_type: eventType,
      booking_id: bookingId,
      smoobu_reservation_id: smoobuReservationId,
      status,
      error_message: errorMessage || null,
    });
  } catch {
    // Non-critical – don't break the sync flow
  }
}
