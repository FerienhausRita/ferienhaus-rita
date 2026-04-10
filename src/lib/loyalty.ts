import { createServerClient } from "@/lib/supabase/server";

/**
 * Generate a unique loyalty code in format RITA-XXXXXX
 */
function generateLoyaltyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "RITA-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a loyalty discount code for a guest after checkout
 */
export async function createLoyaltyCode(
  guestEmail: string,
  sourceBookingId: string,
  discountPercent: number = 10
) {
  const supabase = createServerClient();

  // Check if loyalty code already exists for this booking
  const { data: existing } = await supabase
    .from("discount_codes")
    .select("code")
    .eq("source_booking_id", sourceBookingId)
    .eq("is_loyalty", true)
    .single();

  if (existing) {
    return existing.code;
  }

  // Generate unique code
  let code = generateLoyaltyCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: clash } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("code", code)
      .single();
    if (!clash) break;
    code = generateLoyaltyCode();
    attempts++;
  }

  // Create the discount code
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year

  const { error } = await supabase.from("discount_codes").insert({
    code,
    type: "percent",
    value: discountPercent,
    label: `${discountPercent}% Stammgast-Rabatt`,
    max_uses: 1,
    current_uses: 0,
    valid_until: validUntil.toISOString(),
    active: true,
    guest_email: guestEmail,
    is_loyalty: true,
    source_booking_id: sourceBookingId,
  });

  if (error) {
    console.error("Error creating loyalty code:", error);
    return null;
  }

  return code;
}

/**
 * Check if a guest is a returning guest by email
 */
export async function checkReturningGuest(email: string) {
  const supabase = createServerClient();

  const { data: previousBookings } = await supabase
    .from("bookings")
    .select("id, check_out, apartment_id")
    .eq("email", email)
    .in("status", ["completed", "confirmed"])
    .order("check_out", { ascending: false })
    .limit(1);

  if (!previousBookings || previousBookings.length === 0) {
    return { isReturning: false, previousBookingId: null, loyaltyCode: null };
  }

  // Find active loyalty code for this email
  const { data: loyaltyCode } = await supabase
    .from("discount_codes")
    .select("code, value")
    .eq("guest_email", email)
    .eq("is_loyalty", true)
    .eq("active", true)
    .gt("valid_until", new Date().toISOString())
    .eq("current_uses", 0)
    .single();

  return {
    isReturning: true,
    previousBookingId: previousBookings[0].id,
    loyaltyCode: loyaltyCode?.code || null,
  };
}
