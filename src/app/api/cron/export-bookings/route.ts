import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServerClient } from "@/lib/supabase/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { generateBookingsXlsx } from "@/lib/excel-export";

/**
 * Daily bookings export – sends the generated XLSX to the configured
 * recipient address. Runs on Vercel Cron and can be triggered manually
 * by the "Testversand"-button in the admin settings.
 *
 * Config is stored in site_settings under key `export_email_config`:
 *   { enabled: boolean, recipient: string }
 */

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (vercelCron) return true;
  if (
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return true;
  }
  if (
    authHeader &&
    authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  ) {
    return true;
  }
  // Allow admin browser session (for in-UI "Testversand" that doesn't go via
  // server action)
  try {
    const authSupabase = createAuthServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    if (user) {
      const { data: profile } = await authSupabase
        .from("admin_profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (profile) return true;
    }
  } catch {
    // fallthrough
  }
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

interface ExportConfig {
  enabled: boolean;
  recipient: string;
}

async function run(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: cfgRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "export_email_config")
    .maybeSingle();

  const cfg = (cfgRow?.value ?? {}) as Partial<ExportConfig>;

  // Allow a query-param recipient override for test sends
  const recipientOverride = request.nextUrl.searchParams.get("to");
  const recipient = recipientOverride?.trim() || cfg.recipient?.trim() || "";

  // When no explicit override and config is disabled or has no recipient: skip
  if (!recipientOverride && (!cfg.enabled || !recipient)) {
    return NextResponse.json({
      skipped: true,
      reason: !cfg.enabled ? "disabled" : "no_recipient",
    });
  }

  if (!recipient) {
    return NextResponse.json(
      { error: "Keine Empfänger-E-Mail angegeben" },
      { status: 400 }
    );
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return NextResponse.json(
      { error: "SMTP nicht konfiguriert (SMTP_HOST / SMTP_FROM fehlt)" },
      { status: 500 }
    );
  }

  try {
    const { buffer, bookingCount, guestCount } = await generateBookingsXlsx();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: parseInt(process.env.SMTP_PORT || "587") === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const today = new Date().toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const todayIso = new Date().toISOString().split("T")[0];
    const filename = `Ferienhaus-Rita-Export-${todayIso}.xlsx`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: `Buchungsexport Ferienhaus Rita – ${today}`,
      text: [
        `Hallo,`,
        ``,
        `im Anhang findest du den täglichen Export aller Buchungen (Stand ${today}).`,
        ``,
        `Übersicht:`,
        `  ${bookingCount} Buchungen`,
        `  ${guestCount} Gäste`,
        ``,
        `Die Datei enthält berechnete Formeln — die Zuschläge lassen sich`,
        `beim Klick auf eine Zelle in der Formel-Leiste nachvollziehen.`,
        ``,
        `Diese E-Mail wird automatisch jeden Morgen versendet.`,
        `Empfänger und Aktivierung sind unter Admin → Einstellungen →`,
        `"Täglicher Excel-Export" konfigurierbar.`,
      ].join("\n"),
      attachments: [
        {
          filename,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      sentTo: recipient,
      bookingCount,
      guestCount,
      fileSize: buffer.length,
    });
  } catch (err) {
    console.error("Export email send failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
