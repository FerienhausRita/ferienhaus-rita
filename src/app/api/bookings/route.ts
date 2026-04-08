import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import { calculatePrice } from "@/lib/pricing";
import { getMinNights } from "@/data/seasons";
import { validateDiscountCode } from "@/data/discounts";
import { isAvailableDB } from "@/lib/availability-server";
import {
  sendBookingConfirmation,
  sendBookingNotification,
} from "@/lib/email";

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

    // Verify apartment exists
    const apartment = getApartmentById(data.apartmentId);
    if (!apartment) {
      return NextResponse.json(
        { success: false, message: "Wohnung nicht gefunden" },
        { status: 400 }
      );
    }

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
    const minNights = getMinNights(checkInDate, checkOutDate);
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
