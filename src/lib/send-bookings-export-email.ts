/**
 * Server helper: generate the daily bookings XLSX and deliver it by email.
 *
 * Used by:
 *   - /api/cron/export-bookings   (scheduled via Vercel Cron)
 *   - sendBookingsExportEmailNow server action (manual "Testversand" button)
 *
 * Both callers live inside the Next.js server process, so invoking this
 * helper directly avoids an HTTP round-trip and the associated pitfalls
 * (Vercel deployment protection returning HTML, auth header shenanigans,
 * JSON-parse errors on non-JSON responses, ...).
 */

import nodemailer from "nodemailer";
import { createServerClient } from "@/lib/supabase/server";
import { generateBookingsXlsx } from "@/lib/excel-export";

export type SendBookingsExportResult =
  | {
      success: true;
      sentTo: string;
      bookingCount: number;
      guestCount: number;
      fileSize: number;
    }
  | {
      success: false;
      skipped?: "disabled" | "no_recipient";
      error?: string;
    };

export async function sendBookingsExportEmail(options?: {
  /** Override the configured recipient for this send. */
  recipientOverride?: string;
  /** Bypass the `enabled=false` guard (used by manual "Testversand"). */
  ignoreEnabled?: boolean;
}): Promise<SendBookingsExportResult> {
  const recipientOverride = options?.recipientOverride?.trim();
  const ignoreEnabled = options?.ignoreEnabled === true;

  const supabase = createServerClient();
  const { data: cfgRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "export_email_config")
    .maybeSingle();

  const cfg = (cfgRow?.value ?? {}) as Partial<{
    enabled: boolean;
    recipient: string;
  }>;

  const recipient = recipientOverride || cfg.recipient?.trim() || "";

  if (!recipient) {
    return { success: false, skipped: "no_recipient" };
  }

  if (!ignoreEnabled && !cfg.enabled) {
    return { success: false, skipped: "disabled" };
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    return {
      success: false,
      error: "SMTP nicht konfiguriert (SMTP_HOST / SMTP_FROM fehlt)",
    };
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

    return {
      success: true,
      sentTo: recipient,
      bookingCount,
      guestCount,
      fileSize: buffer.length,
    };
  } catch (err) {
    console.error("sendBookingsExportEmail failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
}
