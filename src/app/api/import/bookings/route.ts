import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { recalculateBookingPrices } from "@/lib/pricing-data";

interface ImportRow {
  apartment_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  dogs: number;
  price_per_night: number;
  extra_guests_total: number;
  dogs_total: number;
  cleaning_fee: number;
  local_tax_total: number;
  discount_amount: number;
  discount_code: string;
  total_price: number;
  status: string;
  payment_status: string;
  invoice_number: string;
  notes: string;
}

interface RowError {
  row: number;
  message: string;
}

/**
 * POST /api/import/bookings
 *
 * Imports bookings from parsed Excel data. Admin-only.
 * Expects: { rows: ImportRow[], filename: string }
 */
export async function POST(request: NextRequest) {
  // --- Auth: admin only ---
  const authSupabase = createAuthServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await authSupabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse body ---
  const body = await request.json();
  const rows: ImportRow[] = body.rows;
  const filename: string = body.filename || "unknown.xlsx";

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Keine Daten zum Importieren" }, { status: 400 });
  }

  const supabase = createServerClient();
  let imported = 0;
  let skipped = 0;
  const errors: RowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed + header)

    try {
      // Validate required fields
      if (!row.apartment_id || !row.email || !row.check_in || !row.check_out) {
        errors.push({ row: rowNum, message: "Pflichtfelder fehlen" });
        continue;
      }

      // Duplicate check: same apartment + dates + email
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("apartment_id", row.apartment_id)
        .eq("check_in", row.check_in)
        .eq("check_out", row.check_out)
        .eq("email", row.email.toLowerCase())
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Upsert guest
      const { data: guestData } = await supabase
        .from("guests")
        .upsert(
          {
            email: row.email.toLowerCase().trim(),
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone || null,
            street: row.street || null,
            zip: row.zip || null,
            city: row.city || null,
            country: row.country || "AT",
          },
          { onConflict: "email" }
        )
        .select("id, total_stays, total_revenue")
        .single();

      // Recalculate prices using the pricing engine
      const calculated = await recalculateBookingPrices({
        apartmentId: row.apartment_id,
        checkIn: row.check_in,
        checkOut: row.check_out,
        adults: row.adults || 2,
        children: row.children || 0,
        dogs: row.dogs || 0,
      });

      if (calculated && row.total_price && Math.abs(row.total_price - calculated.total) > 0.01) {
        console.warn(
          `Import Zeile ${rowNum}: Excel-Preis ${row.total_price} weicht von berechnetem Preis ${calculated.total} ab (Diff: ${(row.total_price - calculated.total).toFixed(2)})`
        );
      }

      // Insert booking – use calculated values, fallback to spreadsheet
      const { error: insertError } = await supabase.from("bookings").insert({
        apartment_id: row.apartment_id,
        check_in: row.check_in,
        check_out: row.check_out,
        nights: calculated?.nights ?? row.nights,
        adults: row.adults || 2,
        children: row.children || 0,
        dogs: row.dogs || 0,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email.toLowerCase().trim(),
        phone: row.phone || "",
        street: row.street || "",
        zip: row.zip || "",
        city: row.city || "",
        country: row.country || "AT",
        notes: row.notes || "",
        price_per_night: calculated ? calculated.basePrice : (row.price_per_night || 0),
        extra_guests_total: calculated ? calculated.extraGuestsTotal : (row.extra_guests_total || 0),
        dogs_total: calculated ? calculated.dogsTotal : (row.dogs_total || 0),
        cleaning_fee: calculated ? calculated.cleaningFee : (row.cleaning_fee || 0),
        local_tax_total: calculated ? calculated.localTaxTotal : (row.local_tax_total || 0),
        discount_amount: calculated ? calculated.discountAmount : (row.discount_amount || 0),
        discount_code: row.discount_code || null,
        total_price: calculated ? calculated.total : (row.total_price || 0),
        status: row.status || "confirmed",
        payment_status: row.payment_status || "unpaid",
        invoice_number: row.invoice_number || null,
        guest_id: guestData?.id ?? null,
      });

      if (insertError) {
        errors.push({ row: rowNum, message: insertError.message });
        continue;
      }

      // Update guest stats
      if (guestData && row.status !== "cancelled") {
        await supabase
          .from("guests")
          .update({
            total_stays: (guestData.total_stays || 0) + 1,
            total_revenue: Number(guestData.total_revenue || 0) + Number(calculated ? calculated.total : row.total_price || 0),
          })
          .eq("id", guestData.id);
      }

      // Remove matching iCal blocked_dates (the booking now covers this period)
      await supabase
        .from("blocked_dates")
        .delete()
        .eq("apartment_id", row.apartment_id)
        .eq("start_date", row.check_in)
        .eq("end_date", row.check_out)
        .like("reason", "iCal:%");

      imported++;
    } catch (err) {
      errors.push({ row: rowNum, message: String(err) });
    }
  }

  // Log import
  try {
    await supabase.from("import_log").insert({
      filename,
      rows_total: rows.length,
      rows_imported: imported,
      rows_skipped: skipped,
      errors: errors.slice(0, 100), // Limit stored errors
      imported_by: user.id,
    });
  } catch {
    // Non-critical – don't fail the import
  }

  return NextResponse.json({ imported, skipped, errors });
}
