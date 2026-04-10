import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyGuestToken } from "@/lib/guest-auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// GET: Get or create conversation for a booking
export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  // Auth: verify guest token
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("guest_token")?.value;
  if (!tokenCookie) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tokenData = verifyGuestToken(tokenCookie);
  if (!tokenData || tokenData.bookingId !== bookingId) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find existing conversation
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("booking_id", bookingId)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  // Load booking to get guest name
  const { data: booking } = await supabase
    .from("bookings")
    .select("first_name, last_name")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from("chat_conversations")
    .insert({
      booking_id: bookingId,
      guest_name: `${booking.first_name} ${booking.last_name}`,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(conversation);
}
