import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Tables to back up (in order of importance)
const BACKUP_TABLES = [
  "bookings",
  "guests",
  "meldeschein",
  "contact_messages",
  "chat_conversations",
  "chat_messages",
  "site_settings",
  "discount_codes",
  "apartment_pricing",
  "blocked_dates",
  "tasks",
  "email_schedule",
  "sent_emails",
  "booking_line_items",
  "points_of_interest",
  "smoobu_sync_log",
  "admin_profiles",
] as const;

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  // Vercel Cron header (set automatically by Vercel)
  if (vercelCron) return true;

  // Bearer token matching CRON_SECRET
  if (process.env.CRON_SECRET) {
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  }

  // Development mode only
  if (!process.env.CRON_SECRET && process.env.NODE_ENV !== "production") return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const backupData: Record<string, unknown[]> = {};
  const errors: string[] = [];
  let totalRows = 0;

  // Export each table
  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .limit(10000); // Safety limit

      if (error) {
        errors.push(`${table}: ${error.message}`);
        continue;
      }

      backupData[table] = data || [];
      totalRows += (data || []).length;
    } catch (err) {
      errors.push(`${table}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Create backup JSON
  const backup = {
    metadata: {
      created_at: new Date().toISOString(),
      tables: Object.keys(backupData).length,
      total_rows: totalRows,
      errors: errors.length > 0 ? errors : undefined,
    },
    data: backupData,
  };

  const backupJson = JSON.stringify(backup, null, 2);
  const backupSizeKB = Math.round(Buffer.byteLength(backupJson) / 1024);

  // Send via email
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail || !process.env.SMTP_HOST) {
    return NextResponse.json({
      success: false,
      error: "E-Mail nicht konfiguriert (NOTIFICATION_EMAIL / SMTP_HOST fehlt)",
      stats: { tables: Object.keys(backupData).length, rows: totalRows, sizeKB: backupSizeKB },
    });
  }

  try {
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

    const tableStats = Object.entries(backupData)
      .map(([table, rows]) => `  ${table}: ${rows.length} Einträge`)
      .join("\n");

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: notificationEmail,
      subject: `Backup Ferienhaus Rita – ${today}`,
      text: [
        `Tägliches Datenbank-Backup vom ${today}`,
        "",
        `Tabellen: ${Object.keys(backupData).length}`,
        `Gesamt: ${totalRows} Datensätze`,
        `Größe: ${backupSizeKB} KB`,
        "",
        "Übersicht:",
        tableStats,
        "",
        errors.length > 0 ? `Fehler:\n  ${errors.join("\n  ")}` : "Keine Fehler.",
        "",
        "Das Backup ist als JSON-Datei im Anhang.",
        "Speichere diese Datei regelmäßig auf OneDrive oder einem anderen sicheren Ort.",
      ].join("\n"),
      attachments: [
        {
          filename: `backup-ferienhaus-rita-${new Date().toISOString().split("T")[0]}.json`,
          content: backupJson,
          contentType: "application/json",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      stats: {
        tables: Object.keys(backupData).length,
        rows: totalRows,
        sizeKB: backupSizeKB,
        sentTo: notificationEmail,
      },
    });
  } catch (err) {
    console.error("Backup email error:", err);
    return NextResponse.json({
      success: false,
      error: `E-Mail-Versand fehlgeschlagen: ${err instanceof Error ? err.message : "Unknown"}`,
      stats: { tables: Object.keys(backupData).length, rows: totalRows, sizeKB: backupSizeKB },
    });
  }
}

export { GET as POST };
