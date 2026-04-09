"use server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendBookingConfirmed, sendCustomEmail, type BankDetails } from "@/lib/email";
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
 * Get analytics data for the dashboard
 */
export async function getAnalyticsData() {
  const supabase = createServerClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // Build last 12 months range
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const twelveMonthsAgo = months[0] + "-01";

  // Fetch non-cancelled bookings for the last 12 months (for revenue + avg + guests)
  const [revenueResult, yearResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("check_in, total_price, email")
      .neq("status", "cancelled")
      .gte("check_in", twelveMonthsAgo)
      .order("check_in", { ascending: true }),
    // Non-cancelled bookings for current year (for occupancy)
    supabase
      .from("bookings")
      .select("apartment_id, check_in, check_out")
      .neq("status", "cancelled")
      .gte("check_in", yearStart)
      .lte("check_in", yearEnd),
  ]);

  const revenueBookings = revenueResult.data ?? [];
  const yearBookings = yearResult.data ?? [];

  // Monthly revenue
  const revenueMap = new Map<string, number>();
  for (const m of months) {
    revenueMap.set(m, 0);
  }
  for (const b of revenueBookings) {
    const month = b.check_in.substring(0, 7);
    if (revenueMap.has(month)) {
      revenueMap.set(month, (revenueMap.get(month) ?? 0) + Number(b.total_price || 0));
    }
  }
  const monthlyRevenue = months.map((m) => ({
    month: m,
    revenue: revenueMap.get(m) ?? 0,
  }));

  // Average booking value
  const nonZeroBookings = revenueBookings.filter(
    (b) => Number(b.total_price) > 0
  );
  const avgBookingValue =
    nonZeroBookings.length > 0
      ? nonZeroBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0) /
        nonZeroBookings.length
      : 0;

  // Total unique guests & returning guests
  const emailCounts = new Map<string, number>();
  for (const b of revenueBookings) {
    if (b.email) {
      const email = b.email.toLowerCase();
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
    }
  }
  const totalGuests = emailCounts.size;
  let returningGuests = 0;
  for (const count of emailCounts.values()) {
    if (count > 1) returningGuests++;
  }

  // Occupancy by apartment
  const apartmentIds = [
    "grossglockner-suite",
    "gletscherblick",
    "almrausch",
    "edelweiss",
  ];
  const daysInYear =
    (new Date(currentYear + 1, 0, 1).getTime() -
      new Date(currentYear, 0, 1).getTime()) /
    (1000 * 60 * 60 * 24);
  // Up to today if current year
  const totalNights = Math.min(
    Math.floor(
      (now.getTime() - new Date(currentYear, 0, 1).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    daysInYear
  );
  // Use full year for the denominator so rates stay comparable
  const denominatorNights = Math.round(daysInYear);

  const occupancyByApartment = apartmentIds.map((id) => {
    const bookings = yearBookings.filter((b) => b.apartment_id === id);
    let occupiedNights = 0;
    for (const b of bookings) {
      const checkIn = new Date(b.check_in + "T00:00:00");
      const checkOut = new Date(b.check_out + "T00:00:00");
      const nights = Math.max(
        0,
        Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      occupiedNights += nights;
    }
    const apt = getApartmentById(id);
    return {
      apartmentId: id,
      apartmentName: apt?.name ?? id,
      occupiedNights,
      totalNights: denominatorNights,
      rate: denominatorNights > 0
        ? Math.round((occupiedNights / denominatorNights) * 100)
        : 0,
    };
  });

  return {
    monthlyRevenue,
    occupancyByApartment,
    avgBookingValue: Math.round(avgBookingValue),
    totalGuests,
    returningGuests,
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

  // Get booking data before update (for email sending and guest recalc)
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || "Buchung nicht gefunden" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  // When confirming: send confirmation email + schedule automated emails
  if (status === "confirmed") {
    try {
      const apartment = getApartmentById(booking.apartment_id);
      if (apartment) {
        // Load bank details
        const { data: bankRow } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "bank_details")
          .single();
        const bankDetails = bankRow?.value as BankDetails | null;

        const bookingEmailData = {
          id: booking.id,
          firstName: booking.first_name,
          lastName: booking.last_name,
          email: booking.email,
          phone: booking.phone || "",
          street: booking.street || "",
          zip: booking.zip || "",
          city: booking.city || "",
          country: booking.country || "",
          notes: booking.notes || "",
          checkIn: new Date(booking.check_in),
          checkOut: new Date(booking.check_out),
          adults: booking.adults,
          children: booking.children || 0,
          dogs: booking.dogs || 0,
          nights: Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)),
          totalPrice: Number(booking.total_price),
          pricePerNight: Number(booking.price_per_night || 0),
          extraGuestsTotal: Number(booking.extra_guests_total || 0),
          dogsTotal: Number(booking.dogs_total || 0),
          cleaningFee: Number(booking.cleaning_fee || 0),
          vatAmount: Number(booking.vat_amount || 0),
        };

        await sendBookingConfirmed(bookingEmailData, apartment, {
          bankDetails: bankDetails || undefined,
        });
      }
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    // Schedule automated emails
    try {
      const { data: timingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "email_timing")
        .single();

      const timing = timingRow?.value as {
        payment_reminder_days?: number;
        checkin_info_days?: number;
        thankyou_days?: number;
      } | null;

      const paymentDays = timing?.payment_reminder_days ?? 7;
      const checkinDays = timing?.checkin_info_days ?? 3;
      const thankyouDays = timing?.thankyou_days ?? 1;

      const now = new Date();
      const ciDate = new Date(booking.check_in + "T08:00:00Z");
      const coDate = new Date(booking.check_out + "T08:00:00Z");

      const scheduledEmails: {
        booking_id: string;
        email_type: string;
        scheduled_for: string;
        status: string;
      }[] = [];

      const paymentDate = new Date(now.getTime() + paymentDays * 24 * 60 * 60 * 1000);
      paymentDate.setUTCHours(8, 0, 0, 0);
      if (paymentDate < ciDate) {
        scheduledEmails.push({
          booking_id: bookingId,
          email_type: "payment_reminder",
          scheduled_for: paymentDate.toISOString(),
          status: "pending",
        });
      }

      const checkinInfoDate = new Date(ciDate.getTime() - checkinDays * 24 * 60 * 60 * 1000);
      checkinInfoDate.setUTCHours(8, 0, 0, 0);
      if (checkinInfoDate > now) {
        scheduledEmails.push({
          booking_id: bookingId,
          email_type: "checkin_info",
          scheduled_for: checkinInfoDate.toISOString(),
          status: "pending",
        });
      }

      const thankyouDate = new Date(coDate.getTime() + thankyouDays * 24 * 60 * 60 * 1000);
      thankyouDate.setUTCHours(8, 0, 0, 0);
      scheduledEmails.push({
        booking_id: bookingId,
        email_type: "thankyou",
        scheduled_for: thankyouDate.toISOString(),
        status: "pending",
      });

      if (scheduledEmails.length > 0) {
        await supabase.from("email_schedule").insert(scheduledEmails);
      }
    } catch (scheduleError) {
      console.error("Error scheduling emails:", scheduleError);
    }
  }

  // When cancelling: skip any pending scheduled emails
  if (status === "cancelled") {
    try {
      await supabase
        .from("email_schedule")
        .update({ status: "skipped" })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    } catch (e) {
      console.error("Error skipping scheduled emails:", e);
    }
  }

  // Recalculate guest stats (total_revenue, total_stays) after any status change
  try {
    const { data: guestBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .eq("email", booking.email)
      .neq("status", "cancelled");

    const totalRevenue = guestBookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) ?? 0;
    const totalStays = guestBookings?.length ?? 0;

    await supabase
      .from("guests")
      .update({ total_revenue: totalRevenue, total_stays: totalStays })
      .eq("email", booking.email);
  } catch (e) {
    console.error("Error recalculating guest stats:", e);
  }

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/gaeste");
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

    // Load bank details for confirmation email
    const { data: bankRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "bank_details")
      .single();
    const bankDetails = bankRow?.value as BankDetails | null;

    await sendBookingConfirmed(
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
      apartment,
      { bankDetails: bankDetails || undefined }
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

export async function getCalendarDataForYear(year: number) {
  const supabase = createServerClient();

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

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

// ============================================
// BOOKING NOTES
// ============================================

/**
 * Get notes for a booking
 */
export async function getBookingNotes(bookingId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("booking_notes")
    .select("id, author_name, content, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Add a note to a booking
 */
export async function addBookingNote(bookingId: string, content: string) {
  const supabase = createServerClient();
  const authClient = createAuthServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet" };

  // Get admin display name
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("booking_notes").insert({
    booking_id: bookingId,
    author_id: user.id,
    author_name: profile?.display_name || user.email || "Admin",
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  return { success: true };
}

// ============================================
// GUEST EMAILS
// ============================================

/**
 * Send email to guest and log it
 */
export async function sendGuestEmail(
  bookingId: string | null,
  guestEmail: string,
  subject: string,
  body: string
) {
  const supabase = createServerClient();
  const authClient = createAuthServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet" };

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  try {
    // Send actual email
    await sendCustomEmail(guestEmail, subject, body);

    // Log in database
    await supabase.from("guest_emails").insert({
      booking_id: bookingId,
      guest_email: guestEmail,
      subject,
      body,
      sent_by: user.id,
      sent_by_name: profile?.display_name || user.email || "Admin",
    });

    if (bookingId) {
      revalidatePath(`/admin/buchungen/${bookingId}`);
    }
    revalidatePath("/admin/nachrichten");
    return { success: true };
  } catch (err) {
    return { success: false, error: "E-Mail konnte nicht gesendet werden" };
  }
}

/**
 * Get sent emails
 */
export async function getSentEmails() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("guest_emails")
    .select("id, booking_id, guest_email, subject, body, sent_by_name, sent_at")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching sent emails:", error);
    return [];
  }

  return data ?? [];
}

// ============================================
// TASKS
// ============================================

/**
 * Get tasks with optional filters
 */
export async function getTasks(filter?: string) {
  const supabase = createServerClient();

  let query = supabase
    .from("tasks")
    .select("id, booking_id, apartment_id, title, description, due_date, category, status, assigned_to, created_at")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filter === "offen") {
    query = query.eq("status", "offen");
  } else if (filter === "erledigt") {
    query = query.eq("status", "erledigt");
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a task
 */
export async function createTask(task: {
  title: string;
  description?: string;
  due_date?: string;
  category: string;
  apartment_id?: string;
  booking_id?: string;
}) {
  const supabase = createServerClient();
  const authClient = createAuthServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet" };

  const { error } = await supabase.from("tasks").insert({
    ...task,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/aufgaben");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Toggle task status
 */
export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  const supabase = createServerClient();
  const newStatus = currentStatus === "offen" ? "erledigt" : "offen";

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/aufgaben");
  return { success: true };
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  const supabase = createServerClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/aufgaben");
  return { success: true };
}

// ============================================
// DISCOUNT CODES
// ============================================

/**
 * Get all discount codes
 */
export async function getDiscountCodes() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching discount codes:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a discount code
 */
export async function createDiscountCode(code: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  label: string;
  min_subtotal?: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string;
}) {
  const supabase = createServerClient();

  const { error } = await supabase.from("discount_codes").insert({
    code: code.code.trim().toUpperCase(),
    type: code.type,
    value: code.value,
    label: code.label.trim(),
    min_subtotal: code.min_subtotal || 0,
    max_uses: code.max_uses || 0,
    valid_from: code.valid_from || null,
    valid_until: code.valid_until || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  return { success: true };
}

/**
 * Toggle discount code active/inactive
 */
export async function toggleDiscountCode(codeId: string, active: boolean) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("discount_codes")
    .update({ active: !active })
    .eq("id", codeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  return { success: true };
}

/**
 * Delete a discount code
 */
export async function deleteDiscountCode(codeId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", codeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  return { success: true };
}

// ============================================
// ICAL SYNC
// ============================================

/**
 * Trigger manual iCal sync
 */
export async function triggerIcalSync() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/ical/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `Sync fehlgeschlagen (${res.status})` };
    }

    const data = await res.json();
    revalidatePath("/admin/kalender");
    revalidatePath("/admin/einstellungen");
    return { success: true, results: data.results };
  } catch (err) {
    return { success: false, error: "Sync konnte nicht gestartet werden" };
  }
}

// ============================================
// ADMIN USER MANAGEMENT
// ============================================

/**
 * Get all admin profiles
 */
export async function getAdminProfiles() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, display_name, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching admin profiles:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Update admin display name
 */
export async function updateDisplayName(newName: string) {
  const supabase = createServerClient();
  const authClient = createAuthServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet" };

  const { error } = await supabase
    .from("admin_profiles")
    .update({ display_name: newName.trim() })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/einstellungen");
  return { success: true };
}

/**
 * Invite a new admin user via Supabase Auth
 */
export async function inviteAdmin(email: string, displayName: string, role: "admin" | "viewer") {
  const supabase = createServerClient();

  // Use Supabase Admin API to invite user
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Create admin profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from("admin_profiles")
      .insert({
        id: data.user.id,
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        role,
      });

    if (profileError) {
      return { success: false, error: profileError.message };
    }
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

/**
 * Update admin role
 */
export async function updateAdminRole(userId: string, role: "admin" | "viewer") {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("admin_profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

/**
 * Remove an admin user
 */
export async function removeAdmin(userId: string) {
  const supabase = createServerClient();
  const authClient = createAuthServerClient();

  // Don't allow removing yourself
  const { data: { user } } = await authClient.auth.getUser();
  if (user?.id === userId) {
    return { success: false, error: "Du kannst dich nicht selbst entfernen" };
  }

  // Delete profile (cascade will handle auth.users FK)
  const { error } = await supabase
    .from("admin_profiles")
    .delete()
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

// ============================================
// DYNAMIC PRICING
// ============================================

/**
 * Update apartment pricing
 */
export async function updateApartmentPricing(
  apartmentId: string,
  pricing: {
    base_price: number;
    extra_person_price: number;
    cleaning_fee: number;
    dog_fee: number;
  }
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("apartment_pricing")
    .update(pricing)
    .eq("apartment_id", apartmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/wohnungen");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Update season config (multiplier + min nights)
 */
export async function updateSeasonConfig(
  type: string,
  config: { multiplier: number; min_nights: number; label: string }
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("season_configs")
    .update(config)
    .eq("type", type);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Get season periods from DB (for admin editor)
 */
export async function getSeasonPeriods() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("season_periods")
    .select("id, type, start_mmdd, end_mmdd, label")
    .order("start_mmdd", { ascending: true });

  if (error) {
    console.error("Error fetching season periods:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a season period
 */
export async function createSeasonPeriod(period: {
  type: string;
  start_mmdd: string;
  end_mmdd: string;
  label: string;
}) {
  const supabase = createServerClient();

  const { error } = await supabase.from("season_periods").insert(period);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Delete a season period
 */
export async function deleteSeasonPeriod(id: string) {
  const supabase = createServerClient();

  const { error } = await supabase.from("season_periods").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Update tax config
 */
export async function updateTaxConfig(key: string, rate: number) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("tax_config")
    .update({ rate })
    .eq("key", key);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

// ============================================
// MANUAL BOOKING CREATION
// ============================================

/**
 * Create a booking manually from admin
 */
export async function createManualBooking(data: {
  apartment_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  dogs: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  notes?: string;
  status: "pending" | "confirmed";
  send_confirmation?: boolean;
}) {
  const supabase = createServerClient();

  const { getApartmentWithPricing, getSeasonConfigsFromDB, getSeasonPeriodsFromDB, getTaxConfigFromDB } = await import("@/lib/pricing-data");
  const { calculatePrice, calculateNights } = await import("@/lib/pricing");

  const apartment = await getApartmentWithPricing(data.apartment_id);
  if (!apartment) return { success: false, error: "Wohnung nicht gefunden" };

  const [seasonConfigs, seasonPeriods, taxConfig] = await Promise.all([
    getSeasonConfigsFromDB(),
    getSeasonPeriodsFromDB(),
    getTaxConfigFromDB(),
  ]);

  const checkIn = new Date(data.check_in);
  const checkOut = new Date(data.check_out);
  const nights = calculateNights(checkIn, checkOut);

  if (nights <= 0) return { success: false, error: "Ungültiger Zeitraum" };

  const breakdown = calculatePrice({
    apartment,
    checkIn,
    checkOut,
    adults: data.adults,
    children: data.children,
    dogs: data.dogs,
    overrides: {
      seasonConfigs,
      seasonPeriods,
      localTaxPerNight: taxConfig.localTaxPerNight,
      vatRate: taxConfig.vatRate,
    },
  });

  // Upsert guest
  const { data: guestData } = await supabase
    .from("guests")
    .upsert(
      {
        email: data.email.toLowerCase().trim(),
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        street: data.street,
        zip: data.zip,
        city: data.city,
        country: data.country,
      },
      { onConflict: "email" }
    )
    .select("id, total_stays, total_revenue")
    .single();

  // Insert booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      apartment_id: data.apartment_id,
      check_in: data.check_in,
      check_out: data.check_out,
      nights,
      adults: data.adults,
      children: data.children,
      dogs: data.dogs,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      notes: data.notes || "",
      price_per_night: breakdown.basePrice,
      extra_guests_total: breakdown.extraGuestsTotal,
      dogs_total: breakdown.dogsTotal,
      cleaning_fee: breakdown.cleaningFee,
      local_tax_total: breakdown.localTaxTotal,
      discount_amount: 0,
      total_price: breakdown.total,
      status: data.status,
      guest_id: guestData?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update guest stats
  if (guestData?.id) {
    await supabase
      .from("guests")
      .update({
        total_stays: (guestData.total_stays ?? 0) + 1,
        total_revenue: Number(guestData.total_revenue ?? 0) + breakdown.total,
        last_visit: data.check_in,
      })
      .eq("id", guestData.id);
  }

  // Schedule automated emails (payment reminder, check-in info, thank you)
  if (booking) {
    try {
      await scheduleBookingEmails(booking.id, data.check_in, data.check_out);
    } catch (scheduleError) {
      console.error("Email scheduling failed for manual booking:", scheduleError);
      // Don't fail the booking
    }
  }

  // Optionally send confirmation
  if (data.send_confirmation && booking) {
    try {
      const { sendBookingConfirmed } = await import("@/lib/email");
      const { data: bankRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "bank_details")
        .single();
      const manualBankDetails = bankRow?.value as BankDetails | null;

      await sendBookingConfirmed(
        {
          id: booking.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone,
          street: data.street,
          zip: data.zip,
          city: data.city,
          country: data.country,
          notes: data.notes || "",
          checkIn,
          checkOut,
          adults: data.adults,
          children: data.children,
          dogs: data.dogs,
          nights,
          totalPrice: breakdown.total,
          pricePerNight: breakdown.basePrice,
          extraGuestsTotal: breakdown.extraGuestsTotal,
          dogsTotal: breakdown.dogsTotal,
          cleaningFee: breakdown.cleaningFee,
          vatAmount: breakdown.vatAmount,
        },
        apartment,
        { bankDetails: manualBankDetails || undefined }
      );

      await supabase
        .from("bookings")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
    } catch {
      // Email failure is non-critical
    }
  }

  revalidatePath("/admin/buchungen");
  revalidatePath("/admin/kalender");
  revalidatePath("/admin");
  revalidatePath("/admin/gaeste");
  return { success: true, bookingId: booking?.id };
}

// ============================================
// GUESTS (DB-backed)
// ============================================

/**
 * Get guests from the guests table
 */
export async function getGuestById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching guest:", error);
    return null;
  }

  return data;
}

export async function getGuestsFromDB(search?: string) {
  const supabase = createServerClient();

  let query = supabase
    .from("guests")
    .select("id, email, first_name, last_name, phone, city, country, total_stays, total_revenue, first_visit, last_visit, notes, created_at")
    .order("last_visit", { ascending: false, nullsFirst: false });

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`
    );
  }

  const { data, error } = await query.limit(200);

  if (error) {
    console.error("Error fetching guests:", error);
    return [];
  }

  return data ?? [];
}

// ============================================
// SITE SETTINGS
// ============================================

export async function getSiteSetting(key: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) {
    console.error("Error fetching setting:", key, error);
    return null;
  }
  return data?.value;
}

export async function getAllSiteSettings() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value");

  if (error) {
    console.error("Error fetching settings:", error);
    return {};
  }

  const settings: Record<string, any> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSiteSetting(key: string, value: any) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error("Error updating setting:", key, error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

// ============================================
// EMAIL SCHEDULE
// ============================================

export async function getEmailSchedule(bookingId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("email_schedule")
    .select("*")
    .eq("booking_id", bookingId)
    .order("scheduled_for", { ascending: true });

  if (error) {
    console.error("Error fetching email schedule:", error);
    return [];
  }
  return data ?? [];
}

export async function scheduleBookingEmails(bookingId: string, checkIn: string, checkOut: string) {
  const supabase = createServerClient();

  // Get email timing from settings
  const timing = await getSiteSetting("email_timing") as {
    payment_reminder_days: number;
    checkin_info_days: number;
    thankyou_days: number
  } | null;

  const paymentDays = timing?.payment_reminder_days ?? 7;
  const checkinDays = timing?.checkin_info_days ?? 3;
  const thankyouDays = timing?.thankyou_days ?? 1;

  const now = new Date();
  const checkInDate = new Date(checkIn + "T08:00:00Z");
  const checkOutDate = new Date(checkOut + "T08:00:00Z");

  const emails = [];

  // Payment reminder: X days from now
  const paymentDate = new Date(now.getTime() + paymentDays * 24 * 60 * 60 * 1000);
  paymentDate.setUTCHours(8, 0, 0, 0);
  if (paymentDate < checkInDate) {
    emails.push({
      booking_id: bookingId,
      email_type: "payment_reminder",
      scheduled_for: paymentDate.toISOString(),
      status: "pending",
    });
  }

  // Check-in info: X days before check-in
  const checkinInfoDate = new Date(checkInDate.getTime() - checkinDays * 24 * 60 * 60 * 1000);
  checkinInfoDate.setUTCHours(8, 0, 0, 0);
  if (checkinInfoDate > now) {
    emails.push({
      booking_id: bookingId,
      email_type: "checkin_info",
      scheduled_for: checkinInfoDate.toISOString(),
      status: "pending",
    });
  }

  // Thank you: X days after check-out
  const thankyouDate = new Date(checkOutDate.getTime() + thankyouDays * 24 * 60 * 60 * 1000);
  thankyouDate.setUTCHours(8, 0, 0, 0);
  emails.push({
    booking_id: bookingId,
    email_type: "thankyou",
    scheduled_for: thankyouDate.toISOString(),
    status: "pending",
  });

  if (emails.length > 0) {
    const { error } = await supabase.from("email_schedule").insert(emails);
    if (error) {
      console.error("Error scheduling emails:", error);
    }
  }
}

export async function skipScheduledEmail(scheduleId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("email_schedule")
    .update({ status: "skipped" })
    .eq("id", scheduleId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/buchungen");
  return { success: true };
}

export async function resendScheduledEmail(scheduleId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("email_schedule")
    .update({ status: "pending", scheduled_for: new Date().toISOString(), sent_at: null, error_message: null })
    .eq("id", scheduleId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/buchungen");
  return { success: true };
}

// ============================================
// INVOICE NUMBER ASSIGNMENT
// ============================================

/**
 * Assigns an invoice number to a booking if it doesn't already have one.
 * Format: FR-{year}-{0001} (4-digit padded sequential number per year).
 * Returns the invoice number (existing or newly assigned).
 */
export async function assignInvoiceNumber(bookingId: string): Promise<string> {
  const supabase = createServerClient();

  // Load booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, invoice_number")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error("Buchung nicht gefunden");
  }

  // Return existing invoice number if already assigned
  if (booking.invoice_number) {
    return booking.invoice_number;
  }

  const currentYear = new Date().getFullYear();

  // Read current counter from site_settings
  const { data: counterRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "invoice_counter")
    .single();

  let counter = counterRow?.value ?? { year: currentYear, next_number: 1 };

  // Reset counter if year changed
  if (counter.year !== currentYear) {
    counter = { year: currentYear, next_number: 1 };
  }

  const nextNumber = counter.next_number;
  const invoiceNumber = `FR-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

  // Save invoice number to booking
  const { error: updateBookingError } = await supabase
    .from("bookings")
    .update({ invoice_number: invoiceNumber })
    .eq("id", bookingId);

  if (updateBookingError) {
    throw new Error("Rechnungsnummer konnte nicht gespeichert werden");
  }

  // Increment counter
  const { error: updateCounterError } = await supabase
    .from("site_settings")
    .upsert({
      key: "invoice_counter",
      value: { year: currentYear, next_number: nextNumber + 1 },
      updated_at: new Date().toISOString(),
    });

  if (updateCounterError) {
    console.error("Error updating invoice counter:", updateCounterError);
  }

  revalidatePath("/admin/buchungen");
  return invoiceNumber;
}

/**
 * Update invoice number for a booking (admin manual edit)
 */
export async function updateInvoiceNumber(
  bookingId: string,
  invoiceNumber: string
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({ invoice_number: invoiceNumber })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/buchungen");
  return { success: true };
}

/**
 * Trigger a manual iCal sync – returns structured summary for UI
 */
export async function triggerICalSync() {
  const { icalFeeds } = await import("@/data/ical-feeds");
  const { parseICal } = await import("@/lib/ical");
  const { apartments } = await import("@/data/apartments");
  const supabase = createServerClient();

  const apartmentNames: Record<string, string> = {};
  for (const apt of apartments) {
    apartmentNames[apt.id] = apt.name;
  }

  const apartmentResults: {
    name: string;
    blocked_count: number;
    deleted_count: number;
    status: "ok" | "error";
    error?: string;
  }[] = [];

  for (const [apartmentId, feedUrls] of Object.entries(icalFeeds)) {
    try {
      const allEvents: { start: string; end: string; summary: string; description: string }[] = [];

      for (const url of feedUrls) {
        try {
          const response = await fetch(url, {
            headers: { "User-Agent": "FerienhausRita/1.0" },
            cache: "no-store",
          });
          if (!response.ok) continue;
          const text = await response.text();
          allEvents.push(...parseICal(text));
        } catch {
          // Skip failed feeds
        }
      }

      const { data: deleted } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("apartment_id", apartmentId)
        .like("reason", "iCal:%")
        .select("id");

      const today = new Date().toISOString().split("T")[0];
      const futureEvents = allEvents.filter((e) => e.end > today);

      if (futureEvents.length > 0) {
        const { error: insertError } = await supabase
          .from("blocked_dates")
          .insert(
            futureEvents.map((e) => {
              let reason = `iCal: ${e.summary}`;
              if (e.description) reason = `iCal: ${e.summary} – ${e.description}`;
              if (reason.length > 500) reason = reason.slice(0, 497) + "...";
              return {
                apartment_id: apartmentId,
                start_date: e.start,
                end_date: e.end,
                reason,
              };
            })
          );

        if (insertError) {
          apartmentResults.push({
            name: apartmentNames[apartmentId] || apartmentId,
            blocked_count: 0,
            deleted_count: deleted?.length ?? 0,
            status: "error",
            error: insertError.message,
          });
          continue;
        }
      }

      apartmentResults.push({
        name: apartmentNames[apartmentId] || apartmentId,
        blocked_count: futureEvents.length,
        deleted_count: deleted?.length ?? 0,
        status: "ok",
      });
    } catch (err) {
      apartmentResults.push({
        name: apartmentNames[apartmentId] || apartmentId,
        blocked_count: 0,
        deleted_count: 0,
        status: "error",
        error: String(err),
      });
    }
  }

  const synced_at = new Date().toISOString();

  revalidatePath("/admin/kalender");
  return { apartments: apartmentResults, synced_at };
}

// =========================================================================
// Meldeschein (Guest Registration)
// =========================================================================

export interface MeldescheinData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  id_type: "passport" | "id_card" | "drivers_license";
  id_number: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  companions: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    nationality: string;
  }[];
  arrival_date: string;
  departure_date: string;
}

export async function submitMeldeschein(
  bookingId: string,
  data: MeldescheinData
) {
  const supabase = createServerClient();

  // Check booking exists
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Buchung nicht gefunden" };
  }

  // Upsert meldeschein (in case guest re-submits)
  const { error } = await supabase.from("meldeschein").upsert(
    {
      booking_id: bookingId,
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth,
      nationality: data.nationality,
      id_type: data.id_type,
      id_number: data.id_number,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      companions: data.companions,
      arrival_date: data.arrival_date,
      departure_date: data.departure_date,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  return { success: true };
}

export async function getMeldeschein(bookingId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("meldeschein")
    .select("*")
    .eq("booking_id", bookingId)
    .single();
  return data;
}

export async function verifyMeldeschein(bookingId: string) {
  const authSupabase = createAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet" };

  const supabase = createServerClient();
  const { error } = await supabase
    .from("meldeschein")
    .update({
      status: "verified",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath(`/admin/meldeschein/${bookingId}`);
  return { success: true };
}
