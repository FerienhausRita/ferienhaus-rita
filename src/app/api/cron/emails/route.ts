import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import {
  sendBookingConfirmed,
  sendPaymentReminder,
  sendDepositReminder,
  sendRemainderReminder,
  sendCheckinInfo,
  sendThankYou,
  sendLoyaltyEmail,
  BankDetails,
  CheckinInfo,
} from "@/lib/email";
import { createLoyaltyCode } from "@/lib/loyalty";

// ---------------------------------------------------------------------------
// Auth (same pattern as /api/ical/sync)
// ---------------------------------------------------------------------------

function verifyAuth(request: NextRequest): boolean {
  const cronSecret = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (process.env.CRON_SECRET) {
    if (cronSecret === `Bearer ${process.env.CRON_SECRET}`) return true;
  }

  if (vercelCron) return true;

  if (
    cronSecret &&
    cronSecret === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return true;
  }

  if (process.env.NODE_ENV === "development") return true;

  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BookingRow {
  id: string;
  apartment_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  notes: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  dogs: number;
  nights: number;
  total_price: number;
  price_per_night: number;
  extra_guests_total: number;
  dogs_total: number;
  cleaning_fee: number;
  local_tax_total: number | null;
  status: string;
  payment_status: string;
}

function buildBookingData(row: BookingRow) {
  const total = Number(row.total_price);
  const localTax = Number(row.local_tax_total || 0);
  const vatAmount = ((total - localTax) / 1.1) * 0.1;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    street: row.street,
    zip: row.zip,
    city: row.city,
    country: row.country,
    notes: row.notes || "",
    checkIn: new Date(row.check_in),
    checkOut: new Date(row.check_out),
    adults: row.adults,
    children: row.children,
    dogs: row.dogs,
    nights: row.nights,
    totalPrice: total,
    pricePerNight: Number(row.price_per_night),
    extraGuestsTotal: Number(row.extra_guests_total),
    dogsTotal: Number(row.dogs_total),
    cleaningFee: Number(row.cleaning_fee),
    localTaxTotal: Number(row.local_tax_total || 0),
    vatAmount,
  };
}

async function loadSiteSetting<T>(
  supabase: ReturnType<typeof createServerClient>,
  key: string
): Promise<T | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();
  return (data?.value as T) ?? null;
}

// ---------------------------------------------------------------------------
// Main processing
// ---------------------------------------------------------------------------

async function processScheduledEmails() {
  const supabase = createServerClient();

  // Fetch all pending emails whose scheduled_for has passed
  const { data: pendingEmails, error: fetchError } = await supabase
    .from("email_schedule")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch scheduled emails: ${fetchError.message}`);
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of pendingEmails) {
    try {
      // Load the booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", entry.booking_id)
        .single();

      if (bookingError || !booking) {
        await markFailed(supabase, entry.id, "Booking not found");
        failed++;
        continue;
      }

      // Skip if booking is cancelled
      if (booking.status === "cancelled") {
        await markSkipped(supabase, entry.id);
        skipped++;
        continue;
      }

      // For payment_reminder: skip if already paid
      if (
        entry.email_type === "payment_reminder" &&
        booking.payment_status === "paid"
      ) {
        await markSkipped(supabase, entry.id);
        skipped++;
        continue;
      }

      // For deposit_reminder: skip if deposit already paid
      if (
        entry.email_type === "deposit_reminder" &&
        (booking.deposit_paid_at || booking.payment_status === "paid")
      ) {
        await markSkipped(supabase, entry.id);
        skipped++;
        continue;
      }

      // For remainder_reminder: skip if remainder already paid
      if (
        entry.email_type === "remainder_reminder" &&
        (booking.remainder_paid_at || booking.payment_status === "paid")
      ) {
        await markSkipped(supabase, entry.id);
        skipped++;
        continue;
      }

      // Load apartment
      const apartment = getApartmentById(booking.apartment_id);
      if (!apartment) {
        await markFailed(
          supabase,
          entry.id,
          `Apartment not found: ${booking.apartment_id}`
        );
        failed++;
        continue;
      }

      const bookingData = buildBookingData(booking as BookingRow);

      // Send the appropriate email
      switch (entry.email_type) {
        case "confirmation": {
          const bankDetails = await loadSiteSetting<BankDetails>(
            supabase,
            "bank_details"
          );
          await sendBookingConfirmed(bookingData, apartment, {
            bankDetails: bankDetails ?? undefined,
          });
          break;
        }

        case "payment_reminder": {
          const bankDetails = await loadSiteSetting<BankDetails>(
            supabase,
            "bank_details"
          );
          if (!bankDetails) {
            await markFailed(
              supabase,
              entry.id,
              "Bank details not configured"
            );
            failed++;
            continue;
          }
          await sendPaymentReminder(
            bookingData,
            apartment,
            bankDetails,
            bookingData.totalPrice
          );
          break;
        }

        case "checkin_info": {
          const checkinInfo = await loadSiteSetting<CheckinInfo>(
            supabase,
            "checkin_info"
          );
          if (!checkinInfo) {
            await markFailed(
              supabase,
              entry.id,
              "Check-in info not configured"
            );
            failed++;
            continue;
          }
          await sendCheckinInfo(bookingData, apartment, checkinInfo);
          break;
        }

        case "deposit_reminder": {
          const bankDetailsDeposit = await loadSiteSetting<BankDetails>(
            supabase,
            "bank_details"
          );
          if (!bankDetailsDeposit) {
            await markFailed(supabase, entry.id, "Bank details not configured");
            failed++;
            continue;
          }
          await sendDepositReminder(
            bookingData,
            apartment,
            bankDetailsDeposit,
            Number(booking.deposit_amount || 0),
            booking.deposit_due_date || ""
          );
          break;
        }

        case "remainder_reminder": {
          const bankDetailsRemainder = await loadSiteSetting<BankDetails>(
            supabase,
            "bank_details"
          );
          if (!bankDetailsRemainder) {
            await markFailed(supabase, entry.id, "Bank details not configured");
            failed++;
            continue;
          }
          await sendRemainderReminder(
            bookingData,
            apartment,
            bankDetailsRemainder,
            Number(booking.remainder_amount || 0),
            booking.remainder_due_date || ""
          );
          break;
        }

        case "thankyou": {
          await sendThankYou(bookingData, apartment);
          break;
        }

        case "loyalty": {
          const loyaltyCode = await createLoyaltyCode(
            booking.email,
            booking.id,
            10
          );
          if (loyaltyCode) {
            await sendLoyaltyEmail(bookingData, apartment, loyaltyCode, 10);
          } else {
            await markFailed(supabase, entry.id, "Could not create loyalty code");
            failed++;
            continue;
          }
          break;
        }

        default: {
          await markFailed(
            supabase,
            entry.id,
            `Unknown email type: ${entry.email_type}`
          );
          failed++;
          continue;
        }
      }

      // Mark as sent
      await supabase
        .from("email_schedule")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", entry.id);
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Failed to process email schedule entry ${entry.id}:`,
        message
      );
      await markFailed(supabase, entry.id, message);
      failed++;
    }
  }

  return {
    processed: pendingEmails.length,
    sent,
    failed,
    skipped,
  };
}

async function markFailed(
  supabase: ReturnType<typeof createServerClient>,
  id: string,
  errorMessage: string
) {
  await supabase
    .from("email_schedule")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", id);
}

async function markSkipped(
  supabase: ReturnType<typeof createServerClient>,
  id: string
) {
  await supabase
    .from("email_schedule")
    .update({ status: "skipped" })
    .eq("id", id);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await processScheduledEmails();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Cron email processing error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
