"use server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendBookingConfirmation, sendCustomEmail } from "@/lib/email";
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

  // Optionally send confirmation
  if (data.send_confirmation && booking) {
    try {
      const { sendBookingConfirmation } = await import("@/lib/email");
      await sendBookingConfirmation(
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
        apartment
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
