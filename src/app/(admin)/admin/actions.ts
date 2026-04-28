"use server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendBookingConfirmed, sendCustomEmail, type BankDetails } from "@/lib/email";
import { normalizeBankDetails } from "@/lib/bank-details";
import { getApartmentWithPricing } from "@/lib/pricing-data";

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
    pendingBookings,
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
    // Month revenue – Aufenthalte die in diesen Monat fallen (Check-in vor Monatsende UND Check-out nach Monatsstart)
    supabase
      .from("bookings")
      .select("total_price")
      .lte("check_in", monthEnd)
      .gte("check_out", monthStart)
      .in("status", ["confirmed", "completed"]),
    // Pending (unconfirmed) bookings revenue
    supabase
      .from("bookings")
      .select("total_price")
      .eq("status", "pending"),
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

  const pendingRevenue =
    pendingBookings.data?.reduce(
      (sum, b) => sum + Number(b.total_price || 0),
      0
    ) ?? 0;

  return {
    pendingCount: pendingResult.count ?? 0,
    unreadMessages: unreadResult.count ?? 0,
    monthRevenue,
    pendingRevenue,
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

  // Resolve apartment names (with DB overrides) once
  const { getApartmentNameMap } = await import("@/lib/pricing-data");
  const aptNameMap = await getApartmentNameMap();

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
    return {
      apartmentId: id,
      apartmentName: aptNameMap.get(id) ?? id,
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
export async function getBookings(filter?: string, search?: string, sortBy?: string, sortDir?: string) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Allowed sort columns (whitelist to prevent injection)
  const allowedSortColumns: Record<string, string> = {
    last_name: "last_name",
    apartment_id: "apartment_id",
    check_in: "check_in",
    total_price: "total_price",
    status: "status",
    created_at: "created_at",
  };

  const orderColumn = allowedSortColumns[sortBy ?? ""] ?? "created_at";
  const ascending = sortDir === "asc";

  let query = supabase
    .from("bookings")
    .select(
      "id, apartment_id, first_name, last_name, email, phone, check_in, check_out, adults, children, dogs, total_price, status, payment_status, created_at, notes, source_channel"
    )
    .order(orderColumn, { ascending: orderColumn === "created_at" && !sortBy ? false : ascending });

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

  // When confirming: calculate deposit/remainder amounts
  const updateData: Record<string, unknown> = { status };

  // Externe Kanäle (Booking.com, Airbnb, Smoobu, ...) laufen komplett über
  // die Plattform. Keine Anzahlungslogik, keine automatischen Mails, keine
  // Reminder. Zahlung wird direkt auf "paid" gesetzt.
  const bookingChannel = (booking.source_channel as string | null) ?? "Website";
  const isExternalBooking = bookingChannel !== "Website";

  if (status === "confirmed" && booking.status !== "confirmed" && isExternalBooking) {
    updateData.payment_status = "paid";
    updateData.deposit_amount = 0;
    updateData.remainder_amount = 0;
  }

  if (status === "confirmed" && booking.status !== "confirmed" && !isExternalBooking) {
    try {
      const { getDepositConfig, computeDepositSplit } = await import(
        "@/lib/deposit-config"
      );
      const cfg = await getDepositConfig();
      const split = computeDepositSplit({
        totalPrice: Number(booking.total_price || 0),
        checkIn: booking.check_in as string,
        config: cfg,
      });
      updateData.deposit_amount = split.deposit_amount;
      updateData.deposit_due_date = split.deposit_due_date;
      updateData.remainder_amount = split.remainder_amount;
      updateData.remainder_due_date = split.remainder_due_date;
    } catch (depositError) {
      console.error("Error calculating deposit:", depositError);
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  // When confirming: auto-assign invoice number if not yet assigned
  if (status === "confirmed" && booking.status !== "confirmed" && !booking.invoice_number) {
    try {
      await assignInvoiceNumber(bookingId);
    } catch (invoiceError) {
      console.error("Error auto-assigning invoice number:", invoiceError);
    }
  }

  // When confirming: send confirmation email + schedule automated emails
  // (NUR für Website-Buchungen — externe Kanäle machen das selbst)
  if (status === "confirmed" && booking.status !== "confirmed" && !isExternalBooking) {
    try {
      const apartment = await getApartmentWithPricing(booking.apartment_id);
      if (apartment) {
        // Load bank details
        const { data: bankRow } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "bank_details")
          .single();
        const bankDetails = normalizeBankDetails(
          bankRow?.value as Record<string, unknown> | null | undefined
        ) as BankDetails | null;

        // Recalculate full breakdown for detailed email line items
        const { recalculateBookingPrices } = await import("@/lib/pricing-data");
        const breakdown = await recalculateBookingPrices({
          apartmentId: booking.apartment_id,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          adults: booking.adults,
          children: booking.children || 0,
          dogs: booking.dogs || 0,
        });

        const nights = Math.ceil(
          (new Date(booking.check_out).getTime() -
            new Date(booking.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        );

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
          nights,
          totalPrice: Number(booking.total_price),
          pricePerNight: Number(booking.price_per_night || 0),
          extraGuestsTotal: Number(booking.extra_guests_total || 0),
          dogsTotal: Number(booking.dogs_total || 0),
          cleaningFee: Number(booking.cleaning_fee || 0),
          localTaxTotal: Number(booking.local_tax_total || 0),
          vatAmount: Number(booking.vat_amount || 0),
          depositAmount: updateData.deposit_amount ? Number(updateData.deposit_amount) : undefined,
          depositDueDate: updateData.deposit_due_date ? String(updateData.deposit_due_date) : undefined,
          remainderAmount: updateData.remainder_amount ? Number(updateData.remainder_amount) : undefined,
          remainderDueDate: updateData.remainder_due_date ? String(updateData.remainder_due_date) : undefined,
          // Detailed breakdown for line-item email
          seasonBreakdown: breakdown?.seasonBreakdown?.map((s) => ({
            label: s.label,
            nights: s.nights,
            pricePerNight: s.pricePerNight,
            total: s.total,
          })),
          extraGuests: breakdown?.extraGuests,
          extraPersonPrice: apartment.extraAdultPrice ?? apartment.extraPersonPrice,
          infants: Number(booking.infants || 0),
          dogFeePerNight: apartment.firstDogFee ?? apartment.dogFee,
          firstDogFee: apartment.firstDogFee ?? apartment.dogFee,
          additionalDogFee: apartment.additionalDogFee ?? apartment.dogFee,
          localTaxPerNight: breakdown?.localTaxPerNight,
          localTaxIncluded: breakdown?.localTaxIncluded,
          localTaxExemptAge: breakdown?.localTaxExemptAge,
          discountLabel: breakdown?.discountLabel ?? null,
          discountAmount: breakdown?.discountAmount ?? Number(booking.discount_amount || 0),
        };

        await sendBookingConfirmed(bookingEmailData, apartment, {
          bankDetails: bankDetails || undefined,
        });

        // Mark terms as sent with confirmation email
        await supabase
          .from("bookings")
          .update({ terms_sent_at: new Date().toISOString() })
          .eq("id", bookingId);
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

      const paymentDays = timing?.payment_reminder_days ?? 14;
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

      // Schedule deposit reminder (based on deposit_due_date if set)
      const depositDueDate = (updateData.deposit_due_date as string) || null;
      const remainderDueDate = (updateData.remainder_due_date as string) || null;

      if (depositDueDate) {
        const depositReminder = new Date(depositDueDate + "T08:00:00Z");
        if (depositReminder > now) {
          scheduledEmails.push({
            booking_id: bookingId,
            email_type: "deposit_reminder",
            scheduled_for: depositReminder.toISOString(),
            status: "pending",
          });
        }
      }

      // Admin-Payment-Check 7 Tage nach Bestätigung — interner Reminder,
      // damit Admin manuell prüft, ob Anzahlung eingegangen ist.
      const adminPaymentCheck = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      adminPaymentCheck.setUTCHours(8, 0, 0, 0);
      if (adminPaymentCheck > now) {
        scheduledEmails.push({
          booking_id: bookingId,
          email_type: "admin_payment_check_7d",
          scheduled_for: adminPaymentCheck.toISOString(),
          status: "pending",
        });
      }

      // Schedule remainder reminder (if split payment)
      if (remainderDueDate) {
        const remainderReminder = new Date(remainderDueDate + "T08:00:00Z");
        if (remainderReminder > now) {
          scheduledEmails.push({
            booking_id: bookingId,
            email_type: "remainder_reminder",
            scheduled_for: remainderReminder.toISOString(),
            status: "pending",
          });
        }
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

      // Loyalty email: 2 days after thank-you
      const loyaltyDate = new Date(thankyouDate.getTime() + 2 * 24 * 60 * 60 * 1000);
      scheduledEmails.push({
        booking_id: bookingId,
        email_type: "loyalty",
        scheduled_for: loyaltyDate.toISOString(),
        status: "pending",
      });

      // Admin notes reminders (7 + 3 days before check-in) — only if the
      // booking has a non-empty notes field.
      if ((booking.notes || "").trim().length > 0) {
        const notes7d = new Date(ciDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        notes7d.setUTCHours(8, 0, 0, 0);
        if (notes7d > now) {
          scheduledEmails.push({
            booking_id: bookingId,
            email_type: "admin_notes_7d",
            scheduled_for: notes7d.toISOString(),
            status: "pending",
          });
        }

        const notes3d = new Date(ciDate.getTime() - 3 * 24 * 60 * 60 * 1000);
        notes3d.setUTCHours(8, 0, 0, 0);
        if (notes3d > now) {
          scheduledEmails.push({
            booking_id: bookingId,
            email_type: "admin_notes_3d",
            scheduled_for: notes3d.toISOString(),
            status: "pending",
          });
        }
      }

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

  // Sync with Smoobu (non-blocking)
  try {
    if (status === "confirmed") {
      const { pushBookingToSmoobu } = await import("@/lib/smoobu/sync");
      pushBookingToSmoobu(bookingId).catch((err: unknown) =>
        console.error("Smoobu push error:", err),
      );
    } else if (status === "cancelled") {
      const { cancelBookingInSmoobu } = await import("@/lib/smoobu/sync");
      cancelBookingInSmoobu(bookingId).catch((err: unknown) =>
        console.error("Smoobu cancel error:", err),
      );
    }
  } catch {
    // Smoobu module not available — ignore
  }

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/gaeste");
  return { success: true };
}

/**
 * Permanently delete a booking
 */
export async function deleteBooking(bookingId: string) {
  const supabase = createServerClient();

  // Get booking to check for Smoobu reservation
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, smoobu_reservation_id, email")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return { success: false, error: "Buchung nicht gefunden" };
  }

  // Cancel in Smoobu if linked
  if (booking.smoobu_reservation_id) {
    try {
      const { cancelBookingInSmoobu } = await import("@/lib/smoobu/sync");
      await cancelBookingInSmoobu(bookingId);
    } catch {
      // Non-critical
    }
  }

  // Delete related records first
  await supabase.from("email_schedule").delete().eq("booking_id", bookingId);
  await supabase.from("booking_line_items").delete().eq("booking_id", bookingId);
  await supabase.from("meldeschein").delete().eq("booking_id", bookingId);
  await supabase.from("smoobu_sync_log").delete().eq("booking_id", bookingId);

  // Delete the booking
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Recalculate guest stats
  if (booking.email) {
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
    } catch {
      // Non-critical
    }
  }

  revalidatePath("/admin/buchungen");
  revalidatePath("/admin");
  revalidatePath("/admin/gaeste");
  return { success: true };
}

/**
 * Update payment status (legacy – kept for backward compat)
 */
export async function updatePaymentStatus(
  bookingId: string,
  paymentStatus: "unpaid" | "deposit_paid" | "paid" | "refunded"
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
  revalidatePath("/admin/zahlungen");
  return { success: true };
}

/**
 * Manually override deposit & remainder amounts and due dates.
 * Only updates the four fields, doesn't touch payments/status.
 */
export async function updateBookingDeposit(
  bookingId: string,
  values: {
    deposit_amount: number;
    deposit_due_date: string | null;
    remainder_amount: number;
    remainder_due_date: string | null;
  }
) {
  const supabase = createServerClient();

  // Sanity: total = deposit + remainder (warn but don't enforce — admin override)
  const { data: booking } = await supabase
    .from("bookings")
    .select("total_price, deposit_paid_at, remainder_paid_at")
    .eq("id", bookingId)
    .single();
  if (!booking) {
    return { success: false, error: "Buchung nicht gefunden" };
  }

  // Verhindern, dass schon bezahlte Beträge nachträglich „kleiner" gesetzt werden.
  // (Z.B. Anzahlung schon eingegangen, dann darf deposit_amount nicht 0 werden.)
  if (booking.deposit_paid_at && values.deposit_amount <= 0) {
    return {
      success: false,
      error: "Anzahlung wurde bereits als bezahlt markiert — Betrag darf nicht 0 sein.",
    };
  }
  if (booking.remainder_paid_at && values.remainder_amount <= 0) {
    return {
      success: false,
      error: "Restbetrag wurde bereits als bezahlt markiert — Betrag darf nicht 0 sein.",
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      deposit_amount: Math.round(values.deposit_amount * 100) / 100,
      deposit_due_date: values.deposit_due_date,
      remainder_amount: Math.round(values.remainder_amount * 100) / 100,
      remainder_due_date: values.remainder_due_date,
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/buchungen");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Mark deposit as paid
 */
export async function markDepositPaid(bookingId: string) {
  const supabase = createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("remainder_amount")
    .eq("id", bookingId)
    .single();

  const remainderAmount = Number(booking?.remainder_amount || 0);
  const newStatus = remainderAmount > 0 ? "deposit_paid" : "paid";

  const { error } = await supabase
    .from("bookings")
    .update({
      deposit_paid_at: new Date().toISOString(),
      payment_status: newStatus,
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Skip deposit_reminder emails
  await supabase
    .from("email_schedule")
    .update({ status: "skipped" })
    .eq("booking_id", bookingId)
    .eq("email_type", "deposit_reminder")
    .eq("status", "pending");

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Record a manual payment for a booking
 */
export async function recordManualPayment(
  bookingId: string,
  data: {
    amount: number;
    paid_at: string; // YYYY-MM-DD
    method: string; // "bank_transfer" | "cash" | "card" | "paypal" | "other"
    note?: string;
    applies_to?: "auto" | "deposit" | "remainder";
  }
) {
  const supabase = createServerClient();

  // Get current booking payment state
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("deposit_amount, remainder_amount, deposit_paid_at, remainder_paid_at, payment_status, total_price")
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return { success: false, error: "Buchung nicht gefunden" };
  }

  const depositAmount = Number(booking.deposit_amount || 0);
  const remainderAmount = Number(booking.remainder_amount || 0);

  // Load already-recorded payments to compute running totals per bucket
  const { data: existingPayments } = await supabase
    .from("booking_payments")
    .select("amount, applies_to")
    .eq("booking_id", bookingId);

  const sumBucket = (bucket: "deposit" | "remainder") =>
    (existingPayments ?? [])
      .filter((p) => p.applies_to === bucket)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  let depositPaidSoFar = sumBucket("deposit");
  let remainderPaidSoFar = sumBucket("remainder");

  // Determine how to split this payment across buckets
  // Auto mode: fill deposit first, overflow to remainder.
  // Explicit mode: goes entirely to the chosen bucket.
  const appliesTo = data.applies_to ?? "auto";
  const ledgerEntries: Array<{ amount: number; applies_to: "deposit" | "remainder" }> = [];

  if (appliesTo === "deposit") {
    ledgerEntries.push({ amount: data.amount, applies_to: "deposit" });
    depositPaidSoFar += data.amount;
  } else if (appliesTo === "remainder") {
    ledgerEntries.push({ amount: data.amount, applies_to: "remainder" });
    remainderPaidSoFar += data.amount;
  } else {
    // auto
    const depositOpen = Math.max(0, depositAmount - depositPaidSoFar);
    const toDeposit = Math.min(depositOpen, data.amount);
    const toRemainder = Math.round((data.amount - toDeposit) * 100) / 100;
    if (toDeposit > 0) {
      ledgerEntries.push({
        amount: Math.round(toDeposit * 100) / 100,
        applies_to: "deposit",
      });
      depositPaidSoFar += toDeposit;
    }
    if (toRemainder > 0) {
      ledgerEntries.push({ amount: toRemainder, applies_to: "remainder" });
      remainderPaidSoFar += toRemainder;
    }
  }

  // Insert ledger entries
  const paidAtIso = new Date(data.paid_at + "T12:00:00Z").toISOString();
  for (const entry of ledgerEntries) {
    const { error: insertErr } = await supabase.from("booking_payments").insert({
      booking_id: bookingId,
      amount: entry.amount,
      paid_at: data.paid_at, // DATE column
      method: data.method,
      applies_to: entry.applies_to,
      note: data.note || null,
    });
    if (insertErr) {
      console.error("booking_payments insert error:", insertErr);
      return {
        success: false,
        error: `Fehler beim Speichern der Zahlung: ${insertErr.message}`,
      };
    }
  }

  // Recompute paid_at timestamps based on running totals
  const updateData: Record<string, unknown> = {};

  // Deposit fully paid?
  if (!booking.deposit_paid_at && depositAmount > 0 && depositPaidSoFar >= depositAmount - 0.01) {
    updateData.deposit_paid_at = paidAtIso;
  }
  // Remainder fully paid?
  if (!booking.remainder_paid_at && remainderAmount > 0 && remainderPaidSoFar >= remainderAmount - 0.01) {
    updateData.remainder_paid_at = paidAtIso;
  }

  // Compute new overall payment_status
  const depositDone =
    (updateData.deposit_paid_at || booking.deposit_paid_at) ||
    depositAmount === 0;
  const remainderDone =
    (updateData.remainder_paid_at || booking.remainder_paid_at) ||
    remainderAmount === 0;

  if (depositDone && remainderDone) {
    updateData.payment_status = "paid";
  } else if (depositDone) {
    updateData.payment_status = "deposit_paid";
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }
  }

  // Skip relevant reminder emails when bucket becomes fully paid
  if (updateData.deposit_paid_at) {
    await supabase
      .from("email_schedule")
      .update({ status: "skipped" })
      .eq("booking_id", bookingId)
      .eq("email_type", "deposit_reminder")
      .eq("status", "pending");
  }
  if (updateData.remainder_paid_at) {
    await supabase
      .from("email_schedule")
      .update({ status: "skipped" })
      .eq("booking_id", bookingId)
      .eq("email_type", "remainder_reminder")
      .eq("status", "pending");
  }

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Get all manual payment ledger entries for a booking.
 */
export async function getBookingPayments(bookingId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("booking_payments")
    .select("id, amount, paid_at, method, applies_to, note, created_at")
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: true });

  if (error) {
    console.error("Error fetching booking payments:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Mark remainder as paid
 */
export async function markRemainderPaid(bookingId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      remainder_paid_at: new Date().toISOString(),
      payment_status: "paid",
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Skip remainder_reminder emails
  await supabase
    .from("email_schedule")
    .update({ status: "skipped" })
    .eq("booking_id", bookingId)
    .eq("email_type", "remainder_reminder")
    .eq("status", "pending");

  revalidatePath("/admin/buchungen");
  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/zahlungen");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Get payment overview for dashboard and payments page
 */
export async function getPaymentOverview(sortBy?: string, sortDir?: string) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Allowed sort columns for payments
  const allowedSortColumns: Record<string, string> = {
    last_name: "last_name",
    deposit_due_date: "deposit_due_date",
    deposit_amount: "deposit_amount",
    remainder_amount: "remainder_amount",
    payment_status: "payment_status",
  };

  const orderColumn = allowedSortColumns[sortBy ?? ""] ?? "deposit_due_date";
  const ascending = sortDir === "desc" ? false : true;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, apartment_id, first_name, last_name, check_in, check_out, total_price, deposit_amount, deposit_due_date, deposit_paid_at, remainder_amount, remainder_due_date, remainder_paid_at, payment_status, status")
    .in("status", ["confirmed", "pending"])
    .neq("payment_status", "paid")
    .neq("payment_status", "refunded")
    .order(orderColumn, { ascending, nullsFirst: false });

  const all = bookings ?? [];

  // Enrich each booking with sums from booking_payments (per bucket)
  const bookingIds = all.map((b) => b.id);
  let payments: { booking_id: string; applies_to: string; amount: number }[] = [];
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("booking_payments")
      .select("booking_id, applies_to, amount")
      .in("booking_id", bookingIds);
    payments = (data ?? []).map((p) => ({
      booking_id: p.booking_id,
      applies_to: p.applies_to,
      amount: Number(p.amount || 0),
    }));
  }

  const paidSums = new Map<string, { deposit: number; remainder: number }>();
  for (const p of payments) {
    const cur = paidSums.get(p.booking_id) ?? { deposit: 0, remainder: 0 };
    if (p.applies_to === "deposit") cur.deposit += p.amount;
    else if (p.applies_to === "remainder") cur.remainder += p.amount;
    paidSums.set(p.booking_id, cur);
  }

  const enriched = all.map((b) => {
    const paid = paidSums.get(b.id) ?? { deposit: 0, remainder: 0 };
    const depositAmount = Number(b.deposit_amount || 0);
    const remainderAmount = Number(b.remainder_amount || 0);
    const depositOpen = Math.max(0, depositAmount - paid.deposit);
    const remainderOpen = Math.max(0, remainderAmount - paid.remainder);
    return {
      ...b,
      deposit_paid_sum: Math.round(paid.deposit * 100) / 100,
      remainder_paid_sum: Math.round(paid.remainder * 100) / 100,
      deposit_open: Math.round(depositOpen * 100) / 100,
      remainder_open: Math.round(remainderOpen * 100) / 100,
      total_open: Math.round((depositOpen + remainderOpen) * 100) / 100,
    };
  });

  const overdueDeposits = enriched.filter(
    (b) => b.deposit_due_date && b.deposit_due_date < today && b.deposit_open > 0.01
  );
  const overdueRemainders = enriched.filter(
    (b) => b.remainder_due_date && b.remainder_due_date < today && b.remainder_open > 0.01
  );

  const totalOutstanding = enriched.reduce(
    (sum, b) => sum + b.total_open,
    0
  );

  return {
    bookings: enriched,
    overdueCount: overdueDeposits.length + overdueRemainders.length,
    totalOutstanding,
  };
}

/**
 * Get caretaker overview: all bookings + blocks overlapping the date range,
 * grouped per apartment + a flat chronological list for the printable detail table.
 *
 * A booking overlaps the window [start, end] if check_in <= end AND check_out >= start.
 */
export async function getCaretakerOverview(start: string, end: string) {
  const supabase = createServerClient();

  const [bookingsResult, blockedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, apartment_id, first_name, last_name, phone, check_in, check_out, adults, children, dogs, status, notes"
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

  const bookings = bookingsResult.data ?? [];
  const blocks = blockedResult.data ?? [];

  // Detect turnovers: same apartment, check_out == another booking's check_in
  const bookingsByApartment = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const arr = bookingsByApartment.get(b.apartment_id) ?? [];
    arr.push(b);
    bookingsByApartment.set(b.apartment_id, arr);
  }

  const turnoverDates = new Set<string>(); // key: apartment_id|date
  for (const [aptId, apts] of bookingsByApartment) {
    const checkIns = new Set(apts.map((b) => b.check_in));
    for (const b of apts) {
      if (checkIns.has(b.check_out)) {
        turnoverDates.add(`${aptId}|${b.check_out}`);
      }
    }
  }

  const timeline = bookings.map((b) => ({
    ...b,
    isTurnoverOut: turnoverDates.has(`${b.apartment_id}|${b.check_out}`),
    isTurnoverIn: turnoverDates.has(`${b.apartment_id}|${b.check_in}`),
  }));

  return {
    bookings: timeline,
    blocks,
  };
}

/**
 * Get cleaning schedule – bookings with check-out in date range
 */
export async function getCleaningSchedule(start: string, end: string) {
  const supabase = createServerClient();

  // Departures (need cleaning)
  const { data: departures } = await supabase
    .from("bookings")
    .select("id, apartment_id, first_name, last_name, check_in, check_out, adults, children, infants, dogs")
    .gte("check_out", start)
    .lte("check_out", end)
    .neq("status", "cancelled")
    .order("check_out", { ascending: true });

  // Arrivals (next guest info for turnover)
  const { data: arrivals } = await supabase
    .from("bookings")
    .select("id, apartment_id, first_name, last_name, check_in, check_out, adults, children, infants, dogs")
    .gte("check_in", start)
    .lte("check_in", end)
    .neq("status", "cancelled")
    .order("check_in", { ascending: true });

  return {
    departures: departures ?? [],
    arrivals: arrivals ?? [],
  };
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

  const apartment = await getApartmentWithPricing(booking.apartment_id);
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
    const bankDetails = normalizeBankDetails(
      bankRow?.value as Record<string, unknown> | null | undefined
    ) as BankDetails | null;

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
        localTaxTotal: Number(booking.local_tax_total || 0),
        // Auslastung additiv: adults + children, infants kostenfrei
        extraGuests: Math.max(
          0,
          booking.adults + (booking.children || 0) - apartment.baseGuests
        ),
        extraPersonPrice: apartment.extraAdultPrice ?? apartment.extraPersonPrice,
        infants: Number(booking.infants || 0),
        dogFeePerNight: apartment.firstDogFee ?? apartment.dogFee,
        firstDogFee: apartment.firstDogFee ?? apartment.dogFee,
        additionalDogFee: apartment.additionalDogFee ?? 7.5,
        vatAmount,
        depositAmount: booking.deposit_amount ? Number(booking.deposit_amount) : undefined,
        depositDueDate: booking.deposit_due_date || undefined,
        remainderAmount: booking.remainder_amount ? Number(booking.remainder_amount) : undefined,
        remainderDueDate: booking.remainder_due_date || undefined,
        // Rabatt aus DB lesen — bei manuell eingetragenem Rabatt im
        // BookingPriceEditor ist `discount_code` ggf. NULL, daher Fallback auf
        // generisches Label.
        discountAmount: Number(booking.discount_amount || 0),
        discountLabel: booking.discount_code
          ? booking.discount_code
          : Number(booking.discount_amount || 0) > 0
          ? "Rabatt"
          : null,
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
    console.error("resendConfirmation error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return { success: false, error: `E-Mail konnte nicht gesendet werden: ${message}` };
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

  // Explicit large range to avoid Supabase's default 1000-row limit —
  // iCal sync can produce thousands of blocked_dates entries per year.
  const [bookingsResult, blockedResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, apartment_id, first_name, last_name, check_in, check_out, status, adults, children, dogs"
      )
      .neq("status", "cancelled")
      .lte("check_in", end)
      .gte("check_out", start)
      .order("check_in", { ascending: true })
      .range(0, 9999),
    supabase
      .from("blocked_dates")
      .select("id, apartment_id, start_date, end_date, reason")
      .lte("start_date", end)
      .gte("end_date", start)
      .order("start_date", { ascending: true })
      .range(0, 9999),
  ]);

  if (bookingsResult.error) {
    console.error("getCalendarDataForYear bookings error:", bookingsResult.error);
  }
  if (blockedResult.error) {
    console.error("getCalendarDataForYear blocks error:", blockedResult.error);
  }

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

/**
 * Delete a contact message permanently.
 */
export async function deleteContactMessage(messageId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", messageId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/nachrichten");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Delete a chat conversation (and all messages via ON DELETE CASCADE).
 */
export async function deleteChatConversation(conversationId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/chat");
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
  assigned_to?: string;
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

  // E-Mail-Benachrichtigung an zugewiesenen Admin oder alle Admins
  try {
    const { sendTaskNotification } = await import("@/lib/email");
    const { data: adminList } = await supabase
      .from("admin_profiles")
      .select("id, display_name, email");

    if (adminList && adminList.length > 0) {
      const recipients = task.assigned_to
        ? adminList.filter((a) => a.id === task.assigned_to)
        : adminList;

      for (const admin of recipients) {
        if (admin.email && admin.id !== user.id) {
          await sendTaskNotification({
            title: task.title,
            description: task.description,
            dueDate: task.due_date,
            category: task.category,
            assignedTo: admin.display_name,
          }, admin.email);
        }
      }
    }
  } catch (emailError) {
    console.error("Error sending task notification:", emailError);
  }

  revalidatePath("/admin/aufgaben");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Get list of admin users (for task assignment etc.)
 */
export async function getAdminList() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, display_name, email")
    .order("display_name");

  if (error) {
    console.error("Error fetching admin list:", error);
    return [];
  }
  return data ?? [];
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
// iCAL IMPORT FEEDS (editable in admin panel)
// ============================================

function detectFeedLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("airbnb")) return "Airbnb";
  if (u.includes("smoobu")) return "Smoobu";
  if (u.includes("booking")) return "Booking.com";
  if (u.includes("vrbo") || u.includes("homeaway")) return "Vrbo";
  return "Extern";
}

export async function getIcalImportFeeds() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ical_import_feeds")
    .select(
      "id, apartment_id, url, label, active, last_synced_at, last_sync_status, last_sync_error, last_sync_event_count, created_at"
    )
    .order("apartment_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching ical feeds:", error);
    return [];
  }
  return data ?? [];
}

export async function createIcalImportFeed(feed: {
  apartment_id: string;
  url: string;
  label?: string;
}) {
  const url = feed.url.trim();
  if (!url.startsWith("http")) {
    return { success: false, error: "URL muss mit http(s):// beginnen" };
  }
  if (!feed.apartment_id) {
    return { success: false, error: "Wohnung fehlt" };
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("ical_import_feeds").insert({
    apartment_id: feed.apartment_id,
    url,
    label: feed.label?.trim() || detectFeedLabel(url),
    active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

export async function updateIcalImportFeed(
  id: string,
  updates: Partial<{ url: string; label: string; active: boolean }>
) {
  const supabase = createServerClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.url !== undefined) {
    const url = updates.url.trim();
    if (!url.startsWith("http")) {
      return { success: false, error: "URL muss mit http(s):// beginnen" };
    }
    payload.url = url;
  }
  if (updates.label !== undefined) payload.label = updates.label.trim() || null;
  if (updates.active !== undefined) payload.active = updates.active;

  const { error } = await supabase
    .from("ical_import_feeds")
    .update(payload)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/einstellungen");
  return { success: true };
}

export async function toggleIcalImportFeed(id: string, active: boolean) {
  return updateIcalImportFeed(id, { active });
}

export async function deleteIcalImportFeed(id: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("ical_import_feeds")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/einstellungen");
  return { success: true };
}

// ============================================
// DAILY EXCEL EXPORT E-MAIL
// ============================================

/**
 * Trigger a manual "test" send of the daily bookings export.
 *
 * Runs the mail-sending helper directly in-process (no HTTP fetch), which
 * avoids the "Unexpected token '<'" JSON-parse error that Vercel deployment
 * protection, redirects or error pages can cause when round-tripping through
 * the own `/api/cron/export-bookings` endpoint.
 */
export async function sendBookingsExportEmailNow(recipientOverride?: string) {
  const authSupabase = createAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht authentifiziert" };

  const { data: profile } = await authSupabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!profile) return { success: false, error: "Keine Admin-Berechtigung" };

  const { sendBookingsExportEmail } = await import(
    "@/lib/send-bookings-export-email"
  );

  const result = await sendBookingsExportEmail({
    recipientOverride,
    // Manual test send: ignore the "enabled" flag so the admin can always
    // trigger a probe, even before activating the daily schedule.
    ignoreEnabled: true,
  });

  if (!result.success) {
    if (result.skipped === "no_recipient") {
      return {
        success: false,
        error: "Kein Empfänger hinterlegt. Bitte E-Mail eintragen und speichern.",
      };
    }
    return {
      success: false,
      error: result.error ?? "Versand fehlgeschlagen",
    };
  }

  return { success: true, sentTo: result.sentTo };
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
/**
 * Update apartment name override. Pass null or empty string to reset to default.
 */
export async function updateApartmentName(
  apartmentId: string,
  nameOverride: string | null
) {
  const supabase = createServerClient();

  const value =
    nameOverride && nameOverride.trim() ? nameOverride.trim() : null;

  // Upsert — ensure a row exists for this apartment
  const { data: existing } = await supabase
    .from("apartment_pricing")
    .select("apartment_id")
    .eq("apartment_id", apartmentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("apartment_pricing")
      .update({ name_override: value })
      .eq("apartment_id", apartmentId);
    if (error) return { success: false, error: error.message };
  } else {
    // No row yet → create one with just the override (prices default to NULL)
    const { error } = await supabase
      .from("apartment_pricing")
      .insert({ apartment_id: apartmentId, name_override: value });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/einstellungen");
  revalidatePath("/admin/preise");
  revalidatePath("/admin/buchungen");
  revalidatePath("/wohnungen");
  revalidatePath("/buchen");
  revalidatePath("/preise");
  return { success: true };
}

export async function updateApartmentPricing(
  apartmentId: string,
  pricing: {
    summer_price?: number;
    winter_price?: number;
    base_price?: number;
    extra_person_price: number;
    extra_adult_price?: number;
    extra_child_price?: number;
    cleaning_fee: number;
    dog_fee: number;
    first_dog_fee?: number;
    additional_dog_fee?: number;
    min_nights_summer?: number;
    min_nights_winter?: number;
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
// SPECIAL PERIODS (Sonderzeiträume)
// ============================================

/**
 * Get special periods from DB (for admin editor)
 */
export async function getSpecialPeriods() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("special_periods")
    .select("id, label, start_mmdd, end_mmdd, surcharge_percent, min_nights, active")
    .order("start_mmdd", { ascending: true });

  if (error) {
    console.error("Error fetching special periods:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a special period
 */
export async function createSpecialPeriod(period: {
  label: string;
  start_mmdd: string;
  end_mmdd: string;
  surcharge_percent: number;
  min_nights: number | null;
}) {
  const supabase = createServerClient();

  const { error } = await supabase.from("special_periods").insert(period);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Update a special period
 */
export async function updateSpecialPeriod(
  id: string,
  updates: Partial<{
    label: string;
    start_mmdd: string;
    end_mmdd: string;
    surcharge_percent: number;
    min_nights: number | null;
    active: boolean;
  }>
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("special_periods")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/preise");
  revalidatePath("/buchen");
  return { success: true };
}

/**
 * Delete a special period
 */
export async function deleteSpecialPeriod(id: string) {
  const supabase = createServerClient();

  const { error } = await supabase.from("special_periods").delete().eq("id", id);

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
/**
 * Update core booking details (dates, apartment, occupancy, notes).
 * Recalculates price-related fields when anything relevant changes.
 */
export async function updateBookingDetails(
  bookingId: string,
  updates: {
    apartment_id?: string;
    check_in?: string;
    check_out?: string;
    adults?: number;
    children?: number;
    infants?: number;
    dogs?: number;
    notes?: string;
  }
) {
  const supabase = createServerClient();

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (fetchErr || !booking) return { success: false, error: "Buchung nicht gefunden" };

  const merged = {
    apartment_id: updates.apartment_id ?? booking.apartment_id,
    check_in: updates.check_in ?? booking.check_in,
    check_out: updates.check_out ?? booking.check_out,
    adults: updates.adults ?? booking.adults,
    children: updates.children ?? booking.children,
    infants: updates.infants ?? booking.infants ?? 0,
    dogs: updates.dogs ?? booking.dogs,
  };

  if (merged.check_in >= merged.check_out) {
    return { success: false, error: "Abreise muss nach Anreise liegen" };
  }

  // Availability check if apartment or dates changed
  const datesOrApartmentChanged =
    merged.apartment_id !== booking.apartment_id ||
    merged.check_in !== booking.check_in ||
    merged.check_out !== booking.check_out;

  if (datesOrApartmentChanged) {
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("apartment_id", merged.apartment_id)
      .neq("status", "cancelled")
      .neq("id", bookingId)
      .lt("check_in", merged.check_out)
      .gt("check_out", merged.check_in)
      .limit(1);
    if (conflicts && conflicts.length > 0) {
      return {
        success: false,
        error: "Überschneidung mit einer bestehenden Buchung in dieser Wohnung",
      };
    }
  }

  // Only external bookings retain manual pricing — don't recalculate
  const bookingChannel = (booking.source_channel as string | null) ?? "Website";
  const isExternal = bookingChannel !== "Website";

  const payload: Record<string, unknown> = {
    apartment_id: merged.apartment_id,
    check_in: merged.check_in,
    check_out: merged.check_out,
    adults: merged.adults,
    children: merged.children,
    infants: merged.infants,
    dogs: merged.dogs,
    notes: updates.notes ?? booking.notes,
  };

  // Recalculate price for Website bookings whenever anything price-relevant changed
  // (infants ändern den Preis nicht, lösen aber keinen Recalc aus)
  const priceRelevantChanged =
    datesOrApartmentChanged ||
    merged.adults !== booking.adults ||
    merged.children !== booking.children ||
    merged.dogs !== booking.dogs;

  // Personenzahl/Hund/Datum/Wohnung wirken sich immer auf die ABHÄNGIGEN
  // Positionen (extra_guests_total, dogs_total, local_tax_total, nights) aus —
  // die müssen mitwandern, damit Anzeige und gespeicherter Stand übereinstimmen.
  // Den Gesamtpreis (manuell eingetragen bei externen Channels) lassen wir bei
  // Plattform-Buchungen unangetastet.
  if (priceRelevantChanged) {
    try {
      const { recalculateBookingPrices } = await import("@/lib/pricing-data");
      const breakdown = await recalculateBookingPrices({
        apartmentId: merged.apartment_id,
        checkIn: merged.check_in,
        checkOut: merged.check_out,
        adults: merged.adults,
        children: merged.children,
        dogs: merged.dogs,
      });
      if (breakdown) {
        // Personen-/Datum-abhängige Positionen → immer recalcen
        payload.nights = breakdown.nights;
        payload.extra_guests_total = breakdown.extraGuestsTotal;
        payload.dogs_total = breakdown.dogsTotal;
        payload.local_tax_total = breakdown.localTaxTotal;

        // Apartment-spezifische Felder + Gesamtpreis nur für Website-Buchungen.
        // Externe Channels behalten ihren manuell eingetragenen Total.
        if (!isExternal) {
          payload.price_per_night = breakdown.basePrice;
          payload.cleaning_fee = breakdown.cleaningFee;
          payload.total_price = breakdown.total;

          // Anzahlung & Restbetrag mit dem neuen Total proportional anpassen —
          // aber nur, wenn noch nichts bezahlt ist und die Buchung schon
          // bestätigt war (sonst werden die Werte erst beim Bestätigen gesetzt).
          const nothingPaid =
            !booking.deposit_paid_at && !booking.remainder_paid_at;
          const wasConfirmed = booking.status === "confirmed";
          if (nothingPaid && wasConfirmed) {
            const { getDepositConfig, computeDepositSplit } = await import(
              "@/lib/deposit-config"
            );
            const cfg = await getDepositConfig();
            const split = computeDepositSplit({
              totalPrice: breakdown.total,
              checkIn: merged.check_in,
              config: cfg,
            });
            payload.deposit_amount = split.deposit_amount;
            payload.deposit_due_date = split.deposit_due_date;
            payload.remainder_amount = split.remainder_amount;
            payload.remainder_due_date = split.remainder_due_date;
          }
        }
      } else if (datesOrApartmentChanged) {
        // Fallback: zumindest nights mitziehen, falls recalc null lieferte
        const nights = Math.ceil(
          (new Date(merged.check_out).getTime() -
            new Date(merged.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        payload.nights = nights;
      }
    } catch (e) {
      console.error("Recalculate on detail update failed:", e);
    }
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update(payload)
    .eq("id", bookingId);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/buchungen");
  revalidatePath("/admin");
  return { success: true };
}

export async function createManualBooking(data: {
  apartment_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants?: number;
  dogs: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone2?: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  notes?: string;
  guest_misc?: string;
  status: "pending" | "confirmed";
  send_confirmation?: boolean;
  source_channel?: string;
  manual_total_price?: number;
  manual_cleaning_fee?: number;
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

  const sourceChannel = data.source_channel ?? "Website";
  const isExternalChannel = sourceChannel !== "Website";

  // Für externe Kanäle: manueller Preis, kein calculatePrice
  const manualTotal = Number(data.manual_total_price || 0);
  const manualCleaning = Number(data.manual_cleaning_fee || 0);

  const breakdown = isExternalChannel
    ? {
        basePrice: nights > 0 ? Math.round(((manualTotal - manualCleaning) / nights) * 100) / 100 : 0,
        basePriceTotal: manualTotal - manualCleaning,
        extraGuests: 0,
        extraGuestsTotal: 0,
        dogsTotal: 0,
        cleaningFee: manualCleaning,
        localTaxTotal: 0,
        subtotal: manualTotal,
        total: manualTotal,
        vatAmount: 0,
      }
    : calculatePrice({
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
          localTaxIncluded: taxConfig.localTaxIncluded,
          localTaxExemptAge: taxConfig.localTaxExemptAge,
          vatRate: taxConfig.vatRate,
        },
      });

  // Upsert guest (only if email provided)
  let guestData: { id: string; total_stays: number | null; total_revenue: number | null } | null = null;
  const emailTrimmed = data.email?.trim().toLowerCase() || "";

  if (emailTrimmed) {
    const { data: guestRow } = await supabase
      .from("guests")
      .upsert(
        {
          email: emailTrimmed,
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
    guestData = guestRow;
  }

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
      infants: data.infants ?? 0,
      dogs: data.dogs,
      first_name: data.first_name,
      last_name: data.last_name,
      email: emailTrimmed || null,
      phone: data.phone,
      phone2: data.phone2 || null,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      notes: data.notes || "",
      guest_misc: data.guest_misc || null,
      price_per_night: breakdown.basePrice,
      extra_guests_total: breakdown.extraGuestsTotal,
      dogs_total: breakdown.dogsTotal,
      cleaning_fee: breakdown.cleaningFee,
      local_tax_total: breakdown.localTaxTotal,
      discount_amount: 0,
      total_price: breakdown.total,
      status: data.status,
      guest_id: guestData?.id ?? null,
      source_channel: sourceChannel,
      // Externe Kanäle: Zahlung läuft über Plattform → als bezahlt markieren
      payment_status: isExternalChannel ? "paid" : "unpaid",
      deposit_amount: 0,
      remainder_amount: 0,
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

  // Schedule automated emails (only for Website/direct bookings with email)
  if (booking && emailTrimmed && !isExternalChannel) {
    try {
      await scheduleBookingEmails(booking.id, data.check_in, data.check_out);
    } catch (scheduleError) {
      console.error("Email scheduling failed for manual booking:", scheduleError);
      // Don't fail the booking
    }
  }

  // Optionally send confirmation (only for Website/direct with email)
  if (data.send_confirmation && booking && emailTrimmed && !isExternalChannel) {
    try {
      const { sendBookingConfirmed } = await import("@/lib/email");
      const { data: bankRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "bank_details")
        .single();
      const manualBankDetails = normalizeBankDetails(
        bankRow?.value as Record<string, unknown> | null | undefined
      ) as BankDetails | null;

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
          localTaxTotal: breakdown.localTaxTotal || 0,
          vatAmount: breakdown.vatAmount,
          extraGuests: "extraGuests" in breakdown ? breakdown.extraGuests : 0,
          extraPersonPrice: apartment.extraAdultPrice ?? apartment.extraPersonPrice,
          infants: data.infants ?? 0,
          dogFeePerNight: apartment.firstDogFee ?? apartment.dogFee,
          firstDogFee: apartment.firstDogFee ?? apartment.dogFee,
          additionalDogFee: apartment.additionalDogFee ?? 7.5,
          // Manuelle Buchung hat aktuell keinen Rabatt — defensiv übergeben
          discountAmount: 0,
          discountLabel: null,
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

/**
 * Update admin-only rating + notes for a guest.
 * Rating is 1-5 (or null to clear).
 */
export async function updateGuestRating(
  guestId: string,
  { rating, notes, misc }: { rating: number | null; notes: string; misc?: string }
) {
  const supabase = createServerClient();
  const payload: Record<string, unknown> = {
    admin_rating: rating,
    admin_notes: notes.trim() || null,
    misc: misc?.trim() || null,
  };
  const { error } = await supabase
    .from("guests")
    .update(payload)
    .eq("id", guestId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/gaeste/${guestId}`);
  revalidatePath("/admin/buchungen");
  return { success: true };
}

/**
 * Lookup a guest's admin rating + notes by their email address.
 * Returns null if no guest record exists or no rating has been set.
 */
export async function getGuestRatingByEmail(email: string) {
  if (!email) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("guests")
    .select("id, admin_rating, admin_notes, total_stays")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return data ?? null;
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

  const paymentDays = timing?.payment_reminder_days ?? 14;
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
 * Get all bookings with invoice numbers for the invoice overview page
 */
export async function getInvoices() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("id, invoice_number, first_name, last_name, apartment_id, check_in, check_out, total_price, status, created_at")
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  return data ?? [];
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

// ---------------------------------------------------------------------------
// Booking price editing
// ---------------------------------------------------------------------------

export async function getBookingLineItems(bookingId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("booking_line_items")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function updateBookingPrices(
  bookingId: string,
  prices: {
    price_per_night: number;
    extra_guests_total: number;
    dogs_total: number;
    cleaning_fee: number;
    local_tax_total: number;
    discount_amount: number;
    nights: number;
  },
  lineItems: { id?: string; label: string; amount: number }[]
) {
  const supabase = createServerClient();

  // Calculate new total
  const baseTotal =
    prices.price_per_night * prices.nights +
    prices.extra_guests_total +
    prices.dogs_total +
    prices.cleaning_fee +
    prices.local_tax_total -
    prices.discount_amount;

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const totalPrice = Math.round((baseTotal + lineItemsTotal) * 100) / 100;

  // Update booking prices
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      price_per_night: prices.price_per_night,
      extra_guests_total: prices.extra_guests_total,
      dogs_total: prices.dogs_total,
      cleaning_fee: prices.cleaning_fee,
      local_tax_total: prices.local_tax_total,
      discount_amount: prices.discount_amount,
      total_price: totalPrice,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Sync line items: delete all existing, then insert new ones
  await supabase
    .from("booking_line_items")
    .delete()
    .eq("booking_id", bookingId);

  if (lineItems.length > 0) {
    const { error: liError } = await supabase
      .from("booking_line_items")
      .insert(
        lineItems.map((li) => ({
          booking_id: bookingId,
          label: li.label,
          amount: li.amount,
        }))
      );

    if (liError) {
      return { success: false, error: liError.message };
    }
  }

  // Update deposit/remainder proportionally if they exist
  const { data: booking } = await supabase
    .from("bookings")
    .select("deposit_amount, remainder_amount, deposit_paid_at, remainder_paid_at, payment_status, check_in")
    .eq("id", bookingId)
    .single();

  if (booking && booking.deposit_amount && !booking.deposit_paid_at && !booking.remainder_paid_at) {
    // Recalculate deposit/remainder mit Anreise-Check — bei Anreise innerhalb
    // der Restbetrag-Frist gibt es keine Anzahlung mehr, sondern Volldeposition.
    const { getDepositConfig, computeDepositSplit } = await import(
      "@/lib/deposit-config"
    );
    const depositCfg = await getDepositConfig();
    const split = computeDepositSplit({
      totalPrice,
      checkIn: booking.check_in as string,
      config: depositCfg,
    });

    await supabase
      .from("bookings")
      .update({
        deposit_amount: split.deposit_amount,
        deposit_due_date: split.deposit_due_date,
        remainder_amount: split.remainder_amount,
        remainder_due_date: split.remainder_due_date,
      })
      .eq("id", bookingId);
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/buchungen");
  revalidatePath("/admin");
  return { success: true, totalPrice };
}

/**
 * Recalculate booking prices from apartment config + guest data.
 * Returns calculated values without saving – admin reviews first.
 */
export async function recalculateBookingPricesAction(bookingId: string) {
  const supabase = createServerClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("apartment_id, check_in, check_out, adults, children, dogs")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { success: false as const, error: "Buchung nicht gefunden" };
  }

  const { recalculateBookingPrices } = await import("@/lib/pricing-data");
  const calculated = await recalculateBookingPrices({
    apartmentId: booking.apartment_id,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    adults: booking.adults,
    children: booking.children ?? 0,
    dogs: booking.dogs ?? 0,
  });

  if (!calculated) {
    return { success: false as const, error: "Apartment-Konfiguration nicht gefunden" };
  }

  return {
    success: true as const,
    prices: {
      pricePerNight: calculated.basePrice,
      extraGuestsTotal: calculated.extraGuestsTotal,
      dogsTotal: calculated.dogsTotal,
      cleaningFee: calculated.cleaningFee,
      localTaxTotal: calculated.localTaxTotal,
      discountAmount: calculated.discountAmount,
      totalPrice: calculated.total,
      nights: calculated.nights,
    },
  };
}

/**
 * Update guest data on a booking (and sync to guests table if email exists)
 */
export async function updateBookingGuestData(
  bookingId: string,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    phone2?: string;
    street: string;
    zip: string;
    city: string;
    country: string;
    guest_misc?: string;
  }
) {
  const supabase = createServerClient();

  // Update the booking record
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      phone2: data.phone2 || null,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      guest_misc: data.guest_misc || null,
    })
    .eq("id", bookingId);

  if (bookingError) {
    return { success: false, error: bookingError.message };
  }

  // If email is provided, upsert the guest record
  if (data.email) {
    await supabase
      .from("guests")
      .upsert(
        {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          street: data.street,
          zip: data.zip,
          city: data.city,
          country: data.country,
        },
        { onConflict: "email" }
      );
  }

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/buchungen");
  return { success: true };
}


// ---------------------------------------------------------------------------
// Test-Mails: Sendet einen synthetischen Mail-Typ an die Admin-Adresse, damit
// das Layout schnell überprüft werden kann ohne echte Buchung anzulegen.
// ---------------------------------------------------------------------------

export type TestEmailType =
  | "inquiry_confirmation"
  | "booking_confirmed"
  | "deposit_reminder"
  | "remainder_reminder"
  | "payment_reminder"
  | "checkin_info"
  | "thankyou"
  | "admin_payment_check_7d"
  | "admin_notes_7d";

export async function sendTestEmail(emailType: TestEmailType) {
  const adminEmail = process.env.NOTIFICATION_EMAIL;
  if (!adminEmail) {
    return { success: false, error: "NOTIFICATION_EMAIL nicht gesetzt" };
  }

  const supabase = createServerClient();

  // Neueste Buchung als Vorlage holen (echte Apartment-Daten + Preise)
  const { data: latestBooking } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const apartment = latestBooking
    ? await getApartmentWithPricing(latestBooking.apartment_id)
    : null;

  if (!latestBooking || !apartment) {
    return {
      success: false,
      error: "Keine bestehende Buchung gefunden — Test braucht ein Vorlagen-Buchung.",
    };
  }

  // Bank- und Check-in-Daten laden
  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .single();
  const bankDetails =
    (normalizeBankDetails(
      bankRow?.value as Record<string, unknown> | null | undefined
    ) as BankDetails | null) ?? {
      iban: "AT00 0000 0000 0000 0000",
      bic: "BICTEST",
      account_holder: "Ferienhaus Rita",
      bank_name: "Test-Bank",
    };

  // Synthetic BookingData mit Admin-Email als Empfänger
  const baseGuests = apartment.baseGuests;
  const adults = Number(latestBooking.adults || 2);
  const children = Number(latestBooking.children || 0);
  const dogs = Number(latestBooking.dogs || 0);
  const nights = Number(latestBooking.nights || 3);
  const totalPrice = Number(latestBooking.total_price || 500);
  // additiv: alle ab 3 zählen
  const extraGuests = Math.max(0, adults + children - baseGuests);
  const infants = Number(latestBooking.infants || 0);

  const synthetic = {
    id: latestBooking.id,
    firstName: "Test",
    lastName: "Empfänger",
    email: adminEmail,
    phone: "+43 0000 000000",
    street: "Teststraße 1",
    zip: "5733",
    city: "Bramberg",
    country: "AT",
    notes: "(Beispiel-Notiz für die Test-Mail)",
    checkIn: new Date(latestBooking.check_in),
    checkOut: new Date(latestBooking.check_out),
    adults,
    children,
    dogs,
    nights,
    totalPrice,
    pricePerNight: Number(latestBooking.price_per_night || 100),
    extraGuestsTotal: Number(latestBooking.extra_guests_total || 0),
    dogsTotal: Number(latestBooking.dogs_total || 0),
    cleaningFee: Number(latestBooking.cleaning_fee || 0),
    localTaxTotal: Number(latestBooking.local_tax_total || 0),
    vatAmount: Math.round((totalPrice / 1.1) * 0.1 * 100) / 100,
    depositAmount: Number(latestBooking.deposit_amount || totalPrice * 0.3),
    depositDueDate: latestBooking.deposit_due_date as string | undefined,
    remainderAmount: Number(latestBooking.remainder_amount || totalPrice * 0.7),
    remainderDueDate: latestBooking.remainder_due_date as string | undefined,
    extraGuests,
    extraPersonPrice: apartment.extraAdultPrice ?? apartment.extraPersonPrice,
    infants,
    dogFeePerNight: apartment.firstDogFee ?? apartment.dogFee,
    firstDogFee: apartment.firstDogFee ?? apartment.dogFee,
    additionalDogFee: apartment.additionalDogFee ?? 7.5,
    localTaxIncluded: false,
    localTaxPerNight: 2.6,
    localTaxExemptAge: 15,
  };

  try {
    const email = await import("@/lib/email");
    switch (emailType) {
      case "inquiry_confirmation":
        await email.sendInquiryConfirmation(synthetic, apartment);
        break;
      case "booking_confirmed":
        await email.sendBookingConfirmed(synthetic, apartment, {
          bankDetails,
        });
        break;
      case "deposit_reminder":
        await email.sendDepositReminder(
          synthetic,
          apartment,
          bankDetails,
          synthetic.depositAmount,
          synthetic.depositDueDate ?? new Date().toISOString().split("T")[0]
        );
        break;
      case "remainder_reminder":
        await email.sendRemainderReminder(
          synthetic,
          apartment,
          bankDetails,
          synthetic.remainderAmount,
          synthetic.remainderDueDate ?? new Date().toISOString().split("T")[0]
        );
        break;
      case "payment_reminder":
        await email.sendPaymentReminder(
          synthetic,
          apartment,
          bankDetails,
          synthetic.totalPrice
        );
        break;
      case "checkin_info":
        await email.sendCheckinInfo(synthetic, apartment, {
          key_handoff: "Schlüsselübergabe vor Ort um 16 Uhr",
          address: "Teststraße 1, 5733 Bramberg",
          parking: "Direkt am Haus",
          house_rules: "Keine Schuhe in der Wohnung.",
          directions: "Folgen Sie der Beschilderung.",
        });
        break;
      case "thankyou":
        await email.sendThankYou(synthetic, apartment);
        break;
      case "admin_payment_check_7d":
        await email.sendAdminPaymentCheck(synthetic, apartment);
        break;
      case "admin_notes_7d":
        await email.sendAdminNotesReminder(synthetic, apartment, 7);
        break;
      default:
        return { success: false, error: "Unbekannter Typ" };
    }
    return { success: true, sentTo: adminEmail };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Warteliste (Admin)
// ---------------------------------------------------------------------------

export async function getWaitlistEntries(filterStatus?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });
  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getWaitlistEntries:", error);
    return [];
  }
  return data ?? [];
}

export async function updateWaitlistStatus(
  id: string,
  status: "active" | "notified" | "booked" | "expired" | "cancelled"
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("waitlist")
    .update({ status })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/warteliste");
  return { success: true };
}

export async function deleteWaitlistEntry(id: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/warteliste");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Rechnungs-Snapshot: finalize + cancel
// ---------------------------------------------------------------------------

/**
 * Erstellt einen Snapshot der Buchung und persistiert ihn als invoice_snapshot.
 * Wenn noch keine invoice_number da ist, wird sie automatisch zugewiesen.
 * Ab jetzt rendert der PDF-Download aus dem Snapshot.
 */
export async function finalizeInvoice(bookingId: string) {
  try {
    const { buildInvoiceSnapshot } = await import("@/lib/invoice-snapshot");
    const supabase = createServerClient();

    // Sicherstellen dass eine invoice_number da ist
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, invoice_number, invoice_finalized_at")
      .eq("id", bookingId)
      .single();
    if (!booking) return { success: false, error: "Buchung nicht gefunden" };
    if (booking.invoice_finalized_at) {
      return {
        success: false,
        error: "Rechnung ist bereits ausgestellt — bitte stornieren um neu zu erstellen",
      };
    }
    if (!booking.invoice_number) {
      await assignInvoiceNumber(bookingId);
    }

    const snapshot = await buildInvoiceSnapshot(bookingId);

    const { error } = await supabase
      .from("bookings")
      .update({
        invoice_snapshot: snapshot,
        invoice_finalized_at: new Date().toISOString(),
        invoice_cancelled_at: null,
      })
      .eq("id", bookingId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/admin/buchungen/${bookingId}`);
    revalidatePath("/admin/rechnungen");
    return { success: true, invoice_number: snapshot.invoice_number };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * Storniert eine ausgestellte Rechnung. Alte Nummer wird in
 * `previous_invoice_number` archiviert (auch der vorherige Wert wird
 * dort durch ein „;"-getrenntes Append erhalten — so bleibt eine
 * History bei mehrfacher Stornierung).
 * `invoice_number`, `invoice_snapshot`, `invoice_finalized_at` werden geleert,
 * `invoice_cancelled_at` gesetzt. Beim nächsten finalizeInvoice() wird eine
 * neue Nummer vergeben.
 */
export async function cancelInvoice(bookingId: string) {
  const supabase = createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("invoice_number, previous_invoice_number, invoice_finalized_at")
    .eq("id", bookingId)
    .single();
  if (!booking) return { success: false, error: "Buchung nicht gefunden" };
  if (!booking.invoice_finalized_at || !booking.invoice_number) {
    return { success: false, error: "Keine ausgestellte Rechnung zum Stornieren" };
  }

  const archived = booking.previous_invoice_number
    ? `${booking.previous_invoice_number}; ${booking.invoice_number}`
    : booking.invoice_number;

  const { error } = await supabase
    .from("bookings")
    .update({
      previous_invoice_number: archived,
      invoice_number: null,
      invoice_snapshot: null,
      invoice_finalized_at: null,
      invoice_cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/buchungen/${bookingId}`);
  revalidatePath("/admin/rechnungen");
  return { success: true };
}
