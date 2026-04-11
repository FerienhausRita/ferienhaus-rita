import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// GET: Fetch messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const supabase = createServerClient();

  // Check auth: either guest token or admin
  const cookieStore = cookies();
  const guestToken = cookieStore.get("guest_token")?.value;
  const authSupabase = createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!guestToken && !user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Admin reading messages → reset unread counter
  if (user) {
    await supabase
      .from("chat_conversations")
      .update({ unread_admin: 0 })
      .eq("id", params.conversationId)
      .gt("unread_admin", 0);
  }

  return NextResponse.json(messages);
}

// POST: Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const body = await request.json();
  const { content, senderType } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Nachricht darf nicht leer sein" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify conversation exists
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, booking_id")
    .eq("id", params.conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Konversation nicht gefunden" }, { status: 404 });
  }

  // Auth check
  const cookieStore = cookies();
  const guestToken = cookieStore.get("guest_token")?.value;

  if (senderType === "guest") {
    if (!guestToken) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const tokenData = verifyGuestToken(guestToken);
    if (!tokenData || tokenData.bookingId !== conversation.booking_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
  } else if (senderType === "admin") {
    const authSupabase = createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Invalid senderType" }, { status: 400 });
  }

  // Insert message
  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: params.conversationId,
      sender_type: senderType,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update conversation
  if (senderType === "guest") {
    // Get current unread count and increment
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("unread_admin")
      .eq("id", params.conversationId)
      .single();

    await supabase
      .from("chat_conversations")
      .update({
        updated_at: new Date().toISOString(),
        unread_admin: ((conv?.unread_admin as number) || 0) + 1,
      })
      .eq("id", params.conversationId);

    // WhatsApp notification (fire-and-forget)
    sendWhatsAppNotification(conversation.booking_id, content.trim()).catch(console.error);
  } else {
    // Admin replied, reset unread
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString(), unread_admin: 0 })
      .eq("id", params.conversationId);
  }

  return NextResponse.json(message);
}

// WhatsApp notification helper
async function sendWhatsAppNotification(bookingId: string, messageContent: string) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!twilioSid || !twilioToken || !twilioFrom || !adminNumber) {
    // WhatsApp not configured, send email fallback
    return;
  }

  const supabase = createServerClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("first_name, last_name, id")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ferienhaus-rita-kals.at";
  const text = `Neue Chat-Nachricht von ${booking.first_name} ${booking.last_name} (${booking.id.slice(0, 8)}):\n\n"${messageContent.slice(0, 200)}"\n\n${baseUrl}/admin/chat`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${twilioFrom}`,
        To: `whatsapp:${adminNumber}`,
        Body: text,
      }),
    });
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
}
