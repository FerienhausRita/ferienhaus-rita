import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { sendContactNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3,
});

const contactSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  message: z.string().min(1, "Nachricht ist erforderlich"),
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
    const { success, remaining } = contactLimiter.check(ip);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Zu viele Anfragen. Bitte versuchen Sie es in 15 Minuten erneut.",
        },
        {
          status: 429,
          headers: { "Retry-After": "900", "X-RateLimit-Remaining": "0" },
        }
      );
    }

    const body = await request.json();

    const result = contactSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, errors, message: "Ungültige Eingaben" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Save to database
    const supabase = createServerClient();
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject || null,
        message: data.message,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { success: false, message: "Fehler beim Speichern der Nachricht" },
        { status: 500 }
      );
    }

    // Send notification email
    try {
      await sendContactNotification({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { success: false, message: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
