"use server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendBookingConfirmation } from "@/lib/email";
import { getApartmentById } from "@/data/apartments";

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.substring(0, 7)}-01`;
  const monthEnd = new Date(
    new Date(monthStart).getFullYear(),
    new Date(monthStart).getMonth() + 1,
    0
  )
    .toISOString()
    .split("T")[0];

  // Parallel queries
  const [
    pendingResult,
    unreadResult,
    upcomingArrivals,
    upcomingDepartures,
    monthBookings,
    recentBookings,
  ] = await Promise.all([
    // Pending bookings count
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    // Unread messages count
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    // Upcoming arrivals (next 7 days)
    supabase
      .from("bookings")
      .select("id, apartment_id, first_name, last_name, check_in, check_out, adults, children, dogs, status")
      .gte("check_in", today)
      .lte(
        "check_in",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      )
      .neq("status", "cancelled")
      .order("check_in", { ascending: true })
      .limit(10),
    // Upcoming departures (next 7 days)
    supabase
      .from("bookings")
      .select("id, apartment_id, first_name, last_name, check_in, check_out, status")
      .gte("check_out", today)
      .lte(
        "check_out",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      )
      .neq("status", "cancelled")
      .order("check_out", { ascending: true })
      .limit(10),
    // Month revenue
    supabase
      .from("bookings")
      .select("total_price")
      .gte("check_in", monthStart)
      .lte("check_in", monthEnd)
      .in("status", ["confirmed", "completed"]),
    // Recent bookings
    supabase
      .from("bookings")
      .select("id, apartment_id, first_name, last_name, check_in, check_out, total_price, status, created_at, payment_status")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const monthRevenue =
    monthBookings.data?.reduce(
      (sum, b) => sum + Number(b.total_price || 0),
      0
    ) ?? 0;

  return {
    pendingCount: pendingResult.count ?? 0,
    unreadMessages: unreadResult.count ?? 0,
    monthRevenue,
    upcomingArrivals: upcomingArrivals.data ?? [],
    upcomingDepartures: upcomingDepartures.data ?? [],
    recentBookings: recentBookings.data ?? [],
  };
}

/**
 * Get all bookings with optional filtering
 */
export async function getBookings(filter?: string, search?: string) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("bookings")
    .select(
      "id, apartment_id, first_name, last_name, email, phone, check_in, check_out, adults, children, dogs, total_price, status, payment_status, created_at, notes"
    )
    .order("created_at", { ascending: false });

  // Apply filter
  switch (filter) {
    case "pending":
      query = query.eq("status", "pending");
      break;
    case "upcoming":
      query = query.gte("check_in", today).in("status", ["confirmed"]);
      break;
    case "current":
      query = query
        .lte("check_in", today)
        .gte("check_out", today)
        .in("status", ["confirmed"]);
      break;
    case "past":
      query = query.lt("check_out", today);
      break;
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
  }

  // Apply search
  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`
    );
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(id: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching booking:", error);
    return null;
  }

  return data;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: "pending" | "confirmed" | "cancelled" | "completed"
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  bookingId: string,
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded"
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({ payment_status: paymentStatus })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  return { success: true };
}

/**
 * Resend booking confirmation email
 */
export async function resendConfirmation(bookingId: string) {
  const supabase = createServerClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { success: false, error: "Buchung nicht gefunden" };
  }

  const apartment = getApartmentById(booking.apartment_id);
  if (!apartment) {
    return { success: false, error: "Wohnung nicht gefunden" };
  }

  try {
    // Calculate VAT: (total - localTax) / 1.10 * 0.10
    const localTax = Number(booking.local_tax_total || 0);
    const total = Number(booking.total_price);
    const vatAmount = (total - localTax) / 1.1 * 0.1;

    await sendBookingConfirmation(
      {
        id: booking.id,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        street: booking.street,
        zip: booking.zip,
        city: booking.city,
        country: booking.country,
        notes: booking.notes || "",
        checkIn: new Date(booking.check_in),
        checkOut: new Date(booking.check_out),
        adults: booking.adults,
        children: booking.children,
        dogs: booking.dogs,
        nights: booking.nights,
        totalPrice: total,
        pricePerNight: Number(booking.price_per_night),
        extraGuestsTotal: Number(booking.extra_guests_total),
        dogsTotal: Number(booking.dogs_total),
        cleaningFee: Number(booking.cleaning_fee),
        vatAmount,
      },
      apartment
    );

    // Update confirmation_sent_at
    await supabase
      .from("bookings")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", bookingId);

    revalidatePath(`/admin/buchungen/${bookingId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "E-Mail konnte nicht gesendet werden" };
  }
}

// ============================================
// CALENDAR & BLOCKED DATES
// ============================================

/**
 * Get all bookings and blocked dates for calendar view
 */
export async function getCalendarData(year: number, month: number) {
  const supabase = createServerClient();

  // Calculate date range: show full month with buffer
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month
  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  const [bookingsResult, blockedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, apartment_id, first_name, last_name, check_in, check_out, status, adults, children, dogs"
      )
      .neq("status", "cancelled")
      .lte("check_in", end)
      .gte("check_out", start)
      .order("check_in", { ascending: true }),
    supabase
      .from("blocked_dates")
      .select("id, apartment_id, start_date, end_date, reason")
      .lte("start_date", end)
      .gte("end_date", start)
      .order("start_date", { ascending: true }),
  ]);

  return {
    bookings: bookingsResult.data ?? [],
    blockedDates: blockedResult.data ?? [],
  };
}

/**
 * Create a blocked date range
 */
export async function createBlockedDate(
  apartmentId: string,
  startDate: string,
  endDate: string,
  reason: string
) {
  const supabase = createServerClient();

  const { error } = await supabase.from("blocked_dates").insert({
    apartment_id: apartmentId,
    start_date: startDate,
    end_date: endDate,
    reason: reason || "Manuell gesperrt",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/kalender");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Delete a blocked date
 */
export async function deleteBlockedDate(id: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/kalender");
  return { success: true };
}

// ============================================
// GUESTS
// ============================================

/**
 * Get unique guests aggregated from bookings
 */
export async function getGuests(search?: string) {
  const supabase = createServerClient();

  let query = supabase
    .from("bookings")
    .select(
      "email, first_name, last_name, phone, city, country, total_price, check_in, check_out, status, created_at"
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`
    );
  }

  const { data, error } = await query.limit(500);

  if (error) {
    console.error("Error fetching guests:", error);
    return [];
  }

  // Aggregate by email
  const guestMap = new Map<
    string,
    {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      city: string;
      country: string;
      totalStays: number;
      totalRevenue: number;
      lastVisit: string;
      firstVisit: string;
    }
  >();

  for (const booking of data ?? []) {
    const existing = guestMap.get(booking.email);
    if (existing) {
      existing.totalStays += 1;
      existing.totalRevenue += Number(booking.total_price || 0);
      if (booking.check_in > existing.lastVisit) {
        existing.lastVisit = booking.check_in;
      }
      if (booking.created_at < existing.firstVisit) {
        existing.firstVisit = booking.created_at;
      }
    } else {
      guestMap.set(booking.email, {
        email: booking.email,
        firstName: booking.first_name,
        lastName: booking.last_name,
        phone: booking.phone,
        city: booking.city,
        country: booking.country,
        totalStays: 1,
        totalRevenue: Number(booking.total_price || 0),
        lastVisit: booking.check_in,
        firstVisit: booking.created_at,
      });
    }
  }

  return Array.from(guestMap.values()).sort(
    (a, b) => b.lastVisit.localeCompare(a.lastVisit)
  );
}

/**
 * Get all bookings for a specific guest (by email)
 */
export async function getGuestBookings(email: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, apartment_id, first_name, last_name, email, phone, street, zip, city, country, check_in, check_out, adults, children, dogs, total_price, status, payment_status, notes, created_at"
    )
    .eq("email", email)
    .order("check_in", { ascending: false });

  if (error) {
    console.error("Error fetching guest bookings:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get contact messages
 */
export async function getContactMessages() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Mark message as read
 */
export async function markMessageRead(messageId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/nachrichten");
  revalidatePath("/admin");
  return { success: true };
}
