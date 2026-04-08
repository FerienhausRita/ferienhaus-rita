import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/lib/pricing";
import { getMinNightsWithOverrides } from "@/lib/pricing";
import { validateDiscountCode } from "@/data/discounts";
import { isAvailableDB } from "@/lib/availability-server";
import {
  getApartmentWithPricing,
  getSeasonConfigsFromDB,
  getSeasonPeriodsFromDB,
  getTaxConfigFromDB,
} from "@/lib/pricing-data";
import {
  sendBookingConfirmation,
  sendBookingNotification,
} from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

const bookingSchema = z.object({
  apartmentId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(6),
  children: z.number().int().min(0).max(4),
  dogs: z.number().int().min(0).max(2),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  street: z.string().min(1, "Adresse ist erforderlich"),
  zip: z.string().min(1, "PLZ ist erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  country: z.string().min(1),
  notes: z.string().optional().default(""),
  discountCode: z.string().optional(),
  privacy: z.literal(true, {
    error: "Datenschutzerklärung muss akzeptiert werden",
  }),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const { success, remaining } = bookingLimiter.check(ip);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Zu viele Buchungsanfragen. Bitte versuchen Sie es in 15 Minuten erneut.",
        },
        {
          status: 429,
          headers: { "Retry-After": "900", "X-RateLimit-Remaining": "0" },
        }
      );
    }

    const body = await request.json();

    // Validate input
    const result = bookingSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, errors, message: "Ungültige Eingaben" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify apartment exists (using DB pricing)
    const apartment = await getApartmentWithPricing(data.apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { success: false, message: "Wohnung nicht gefunden" },
        { status: 400 }
      );
    }

    // Fetch pricing data from DB
    const [seasonConfigs, seasonPeriods, taxConfig] = await Promise.all([
      getSeasonConfigsFromDB(),
      getSeasonPeriodsFromDB(),
      getTaxConfigFromDB(),
    ]);

    // Verify guest count doesn't exceed max
    const totalGuests = data.adults + data.children;
    if (totalGuests > apartment.maxGuests) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximale Gästeanzahl für ${apartment.name}: ${apartment.maxGuests}`,
        },
        { status: 400 }
      );
    }

    // Verify minimum nights
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pricingOverrides = {
      seasonConfigs,
      seasonPeriods,
      localTaxPerNight: taxConfig.localTaxPerNight,
      vatRate: taxConfig.vatRate,
    };
    const minNights = getMinNightsWithOverrides(
      checkInDate,
      checkOutDate,
      seasonPeriods,
      seasonConfigs
    );
    if (nights < minNights) {
      return NextResponse.json(
        {
          success: false,
          message: `Mindestaufenthalt für den gewählten Zeitraum: ${minNights} Nächte`,
        },
        { status: 400 }
      );
    }

    // Check availability (database-level, prevents race conditions)
    const available = await isAvailableDB(
      data.apartmentId,
      data.checkIn,
      data.checkOut
    );
    if (!available) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Die gewählten Daten sind leider nicht mehr verfügbar. Bitte wählen Sie einen anderen Zeitraum.",
        },
        { status: 409 }
      );
    }

    // Validate discount code server-side
    const discount = data.discountCode
      ? validateDiscountCode(data.discountCode)
      : null;

    // Recalculate price server-side (never trust client-submitted prices)
    const priceBreakdown = calculatePrice({
      apartment,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: data.adults,
      children: data.children,
      dogs: data.dogs,
      discount,
      overrides: pricingOverrides,
    });

    // Insert booking into database
    const supabase = createServerClient();
    const { data: booking, error: dbError } = await supabase
      .from("bookings")
      .insert({
        apartment_id: data.apartmentId,
        check_in: data.checkIn,
        check_out: data.checkOut,
        adults: data.adults,
        children: data.children,
        dogs: data.dogs,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        street: data.street,
        zip: data.zip,
        city: data.city,
        country: data.country,
        notes: data.notes,
        nights: priceBreakdown.nights,
        price_per_night: priceBreakdown.basePrice,
        extra_guests_total: priceBreakdown.extraGuestsTotal,
        dogs_total: priceBreakdown.dogsTotal,
        cleaning_fee: priceBreakdown.cleaningFee,
        local_tax_total: priceBreakdown.localTaxTotal,
        discount_code: discount?.code || null,
        discount_amount: priceBreakdown.discountAmount,
        total_price: priceBreakdown.total,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError || !booking) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { success: false, message: "Fehler beim Speichern der Buchung" },
        { status: 500 }
      );
    }

    // Upsert guest record (non-blocking — don't fail the booking if guest upsert fails)
    try {
      const { data: guestData } = await supabase
        .from("guests")
        .upsert(
          {
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            street: data.street,
            zip: data.zip,
            city: data.city,
            country: data.country,
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (guestData) {
        // Update guest stats
        const { data: guestBookings } = await supabase
          .from("bookings")
          .select("total_price, check_in, status")
          .eq("email", data.email)
          .neq("status", "cancelled");

        const totalStays = guestBookings?.length ?? 1;
        const totalRevenue = guestBookings?.reduce(
          (sum, b) => sum + Number(b.total_price || 0),
          0
        ) ?? priceBreakdown.total;
        const visits = guestBookings?.map((b) => b.check_in).sort() ?? [data.checkIn];

        await supabase
          .from("guests")
          .update({
            total_stays: totalStays,
            total_revenue: totalRevenue,
            first_visit: visits[0],
            last_visit: visits[visits.length - 1],
          })
          .eq("id", guestData.id);

        // Link guest to booking
        await supabase
          .from("bookings")
          .update({ guest_id: guestData.id })
          .eq("id", booking.id);
      }
    } catch (guestError) {
      console.error("Guest upsert failed:", guestError);
      // Don't fail the booking
    }

    // Send emails (non-blocking — don't fail the booking if email fails)
    const bookingEmailData = {
      id: booking.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      street: data.street,
      zip: data.zip,
      city: data.city,
      country: data.country,
      notes: data.notes || "",
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: data.adults,
      children: data.children,
      dogs: data.dogs,
      nights: priceBreakdown.nights,
      totalPrice: priceBreakdown.total,
      pricePerNight: priceBreakdown.basePrice,
      extraGuestsTotal: priceBreakdown.extraGuestsTotal,
      dogsTotal: priceBreakdown.dogsTotal,
      cleaningFee: priceBreakdown.cleaningFee,
      vatAmount: priceBreakdown.vatAmount,
    };

    try {
      await Promise.all([
        sendBookingConfirmation(bookingEmailData, apartment),
        sendBookingNotification(bookingEmailData, apartment),
      ]);

      // Mark confirmation as sent
      await supabase
        .from("bookings")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the booking — emails can be resent manually
    }

    // Schedule automated emails (payment reminder, check-in info, thank you)
    // Best-effort: don't fail the booking if scheduling fails
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
      const ciDate = new Date(data.checkIn + "T08:00:00Z");
      const coDate = new Date(data.checkOut + "T08:00:00Z");

      const scheduledEmails: {
        booking_id: string;
        email_type: string;
        scheduled_for: string;
        status: string;
      }[] = [];

      // Payment reminder: X days from now
      const paymentDate = new Date(now.getTime() + paymentDays * 24 * 60 * 60 * 1000);
      paymentDate.setUTCHours(8, 0, 0, 0);
      if (paymentDate < ciDate) {
        scheduledEmails.push({
          booking_id: booking.id,
          email_type: "payment_reminder",
          scheduled_for: paymentDate.toISOString(),
          status: "pending",
        });
      }

      // Check-in info: X days before check-in
      const checkinInfoDate = new Date(ciDate.getTime() - checkinDays * 24 * 60 * 60 * 1000);
      checkinInfoDate.setUTCHours(8, 0, 0, 0);
      if (checkinInfoDate > now) {
        scheduledEmails.push({
          booking_id: booking.id,
          email_type: "checkin_info",
          scheduled_for: checkinInfoDate.toISOString(),
          status: "pending",
        });
      }

      // Thank you: X days after check-out
      const thankyouDate = new Date(coDate.getTime() + thankyouDays * 24 * 60 * 60 * 1000);
      thankyouDate.setUTCHours(8, 0, 0, 0);
      scheduledEmails.push({
        booking_id: booking.id,
        email_type: "thankyou",
        scheduled_for: thankyouDate.toISOString(),
        status: "pending",
      });

      if (scheduledEmails.length > 0) {
        const { error: scheduleError } = await supabase
          .from("email_schedule")
          .insert(scheduledEmails);
        if (scheduleError) {
          console.error("Error scheduling automated emails:", scheduleError);
        }
      }
    } catch (scheduleError) {
      console.error("Email scheduling failed:", scheduleError);
      // Don't fail the booking
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      total: priceBreakdown.total,
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return NextResponse.json(
      { success: false, message: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
