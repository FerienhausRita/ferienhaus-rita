import nodemailer from "nodemailer";
import { formatCurrency, formatDate } from "@/lib/pricing";
import { Apartment } from "@/data/apartments";
import { contact } from "@/data/contact";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface BookingData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  notes: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  dogs: number;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  extraGuestsTotal: number;
  dogsTotal: number;
  cleaningFee: number;
  localTaxTotal: number;
  vatAmount: number;
  depositAmount?: number;
  depositDueDate?: string;
  remainderAmount?: number;
  remainderDueDate?: string;
}

export interface BankDetails {
  iban: string;
  bic: string;
  account_holder: string;
  bank_name: string;
}

export interface CheckinInfo {
  key_handoff: string;
  address: string;
  parking: string;
  house_rules: string;
  directions: string;
}

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: parseInt(process.env.SMTP_PORT || "587") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ---------------------------------------------------------------------------
// Colors & constants
// ---------------------------------------------------------------------------

const GOLD = "#c8a96e";
const DARK = "#292524";
const GRAY = "#78716c";
const LIGHT_GRAY = "#a8a29e";
const BG = "#fafaf9";
const WHITE = "#ffffff";
const BORDER = "#e7e5e4";
const CARD_BG = "#f5f5f4";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://ferienhaus-rita-kals.at";

// ---------------------------------------------------------------------------
// Base layout
// ---------------------------------------------------------------------------

function emailBaseLayout(content: string, preheader?: string): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Ferienhaus Rita</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" style="width:100%;border:none;border-spacing:0;background-color:${BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <!--[if mso]><table role="presentation" align="center" style="width:600px;"><tr><td><![endif]-->
        <div style="max-width:600px;margin:0 auto;">

          <!-- Header -->
          <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
              <td style="padding:0 0 4px;text-align:center;">
                <div style="display:inline-block;width:60px;height:3px;background-color:${GOLD};border-radius:2px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 4px;text-align:center;">
                <h1 style="margin:0;font-size:26px;font-weight:700;color:${DARK};letter-spacing:0.5px;">Ferienhaus Rita</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 28px;text-align:center;">
                <p style="margin:0;font-size:12px;color:${GRAY};letter-spacing:2.5px;text-transform:uppercase;">Kals am Gro\u00dfglockner</p>
              </td>
            </tr>
          </table>

          <!-- Content card -->
          <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
              <td style="background:${WHITE};border-radius:12px;border:1px solid ${BORDER};padding:36px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                ${content}
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <table role="presentation" style="width:100%;border:none;border-spacing:0;">
            <tr>
              <td style="padding:28px 0 0;text-align:center;">
                <div style="display:inline-block;width:40px;height:2px;background-color:${GOLD};border-radius:1px;margin-bottom:16px;"></div>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding:0 0 8px;">
                <p style="margin:0;font-size:13px;color:${GRAY};line-height:1.6;">
                  Ferienhaus Rita &middot; ${contact.street} &middot; ${contact.zip} ${contact.city} &middot; ${contact.country}
                </p>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding:0 0 8px;">
                <p style="margin:0;font-size:13px;color:${GRAY};line-height:1.6;">
                  <a href="mailto:${contact.email}" style="color:${GOLD};text-decoration:none;">${contact.email}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${contact.phoneHref}" style="color:${GOLD};text-decoration:none;">${contact.phone}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding:0 0 8px;">
                <p style="margin:0;font-size:12px;color:${LIGHT_GRAY};line-height:1.6;">
                  <a href="${BASE_URL}/impressum" style="color:${LIGHT_GRAY};text-decoration:underline;">Impressum</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${BASE_URL}/datenschutz" style="color:${LIGHT_GRAY};text-decoration:underline;">Datenschutz</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${BASE_URL}/agb" style="color:${LIGHT_GRAY};text-decoration:underline;">AGB</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="text-align:center;padding:4px 0 0;">
                <p style="margin:0;font-size:11px;color:${LIGHT_GRAY};">Alle Preise inkl. 10% MwSt.</p>
              </td>
            </tr>
          </table>

        </div>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function paymentReference(bookingId: string): string {
  return `FR-${bookingId.slice(0, 8).toUpperCase()}`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" style="width:100%;border:none;border-spacing:0;">
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="12%" strokecolor="${GOLD}" fillcolor="${GOLD}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">${escapeHtml(label)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" target="_blank" style="display:inline-block;background-color:${GOLD};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;line-height:1;">
            ${escapeHtml(label)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function sectionHeading(text: string): string {
  return `<h3 style="margin:28px 0 14px;font-size:15px;font-weight:700;color:${DARK};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(text)}</h3>`;
}

function detailRow(label: string, value: string, options?: { bold?: boolean; alignRight?: boolean }): string {
  const fontWeight = options?.bold ? "700" : "400";
  const textAlign = options?.alignRight ? "text-align:right;" : "";
  return `
    <tr>
      <td style="padding:7px 0;color:${GRAY};font-size:14px;">${label}</td>
      <td style="padding:7px 0;font-size:14px;font-weight:${fontWeight};color:${DARK};${textAlign}">${value}</td>
    </tr>`;
}

function divider(): string {
  return `<tr><td colspan="2" style="padding:0;"><div style="border-top:1px solid ${BORDER};margin:4px 0;"></div></td></tr>`;
}

function strongDivider(): string {
  return `<tr><td colspan="2" style="padding:0;"><div style="border-top:2px solid ${DARK};margin:4px 0;"></div></td></tr>`;
}

function bookingDetailsCard(booking: BookingData, apartment: Apartment): string {
  return `
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:16px 0;">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${detailRow("Wohnung", `${escapeHtml(apartment.name)} (${apartment.size} m\u00b2)`, { bold: true })}
        ${detailRow("Anreise", formatDate(booking.checkIn), { bold: true })}
        ${detailRow("Abreise", formatDate(booking.checkOut), { bold: true })}
        ${detailRow("N\u00e4chte", String(booking.nights), { bold: true })}
        ${detailRow(
          "G\u00e4ste",
          `${booking.adults} Erwachsene${booking.children > 0 ? `, ${booking.children} Kinder` : ""}${booking.dogs > 0 ? `, ${booking.dogs} Hund${booking.dogs > 1 ? "e" : ""}` : ""}`,
          { bold: true }
        )}
      </table>
    </div>`;
}

function priceTable(booking: BookingData): string {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
      ${detailRow(
        `${booking.nights} &times; \u00dcbernachtung`,
        formatCurrency(booking.pricePerNight * booking.nights),
        { alignRight: true }
      )}
      ${booking.extraGuestsTotal > 0 ? detailRow("Zusatzg\u00e4ste", formatCurrency(booking.extraGuestsTotal), { alignRight: true }) : ""}
      ${booking.dogsTotal > 0 ? detailRow(`Hund${booking.dogs > 1 ? "e" : ""}`, formatCurrency(booking.dogsTotal), { alignRight: true }) : ""}
      ${detailRow("Endreinigung", formatCurrency(booking.cleaningFee), { alignRight: true })}
      ${booking.localTaxTotal > 0 ? detailRow("Ortstaxe", formatCurrency(booking.localTaxTotal), { alignRight: true }) : ""}
      ${strongDivider()}
      <tr>
        <td style="padding:12px 0;font-weight:700;font-size:17px;color:${DARK};">Gesamtpreis</td>
        <td style="padding:12px 0;font-weight:700;font-size:17px;color:${DARK};text-align:right;">${formatCurrency(booking.totalPrice)}</td>
      </tr>
      ${booking.vatAmount > 0 ? `
      <tr>
        <td style="padding:2px 0;color:${LIGHT_GRAY};font-size:12px;">Inkl. 10% MwSt.</td>
        <td style="padding:2px 0;color:${LIGHT_GRAY};font-size:12px;text-align:right;">${formatCurrency(booking.vatAmount)}</td>
      </tr>` : ""}
    </table>`;
}

function bankDetailsBlock(bankDetails: BankDetails, reference: string, amount?: number): string {
  return `
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:16px 0;border-left:4px solid ${GOLD};">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${DARK};">Bankverbindung</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${bankDetails.account_holder ? detailRow("Empfänger", escapeHtml(bankDetails.account_holder), { bold: true }) : ""}
        ${bankDetails.iban ? detailRow("IBAN", escapeHtml(bankDetails.iban), { bold: true }) : ""}
        ${bankDetails.bic ? detailRow("BIC", escapeHtml(bankDetails.bic), { bold: true }) : ""}
        ${bankDetails.bank_name ? detailRow("Bank", escapeHtml(bankDetails.bank_name), { bold: true }) : ""}
        ${detailRow("Verwendungszweck", `<span style="color:${GOLD};font-weight:700;">${escapeHtml(reference)}</span>`, { bold: true })}
        ${amount !== undefined ? detailRow("Betrag", `<span style="font-weight:700;">${formatCurrency(amount)}</span>`, { bold: true }) : ""}
      </table>
    </div>`;
}

function signoff(): string {
  return `
    <p style="color:${GRAY};font-size:14px;line-height:1.7;margin:28px 0 0;">
      Herzliche Gr\u00fc\u00dfe,<br>
      Ihr Team vom Ferienhaus Rita
    </p>`;
}

// ---------------------------------------------------------------------------
// sendInquiryConfirmation (sent immediately when guest submits a booking)
// ---------------------------------------------------------------------------

export async function sendInquiryConfirmation(
  booking: BookingData,
  apartment: Apartment
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);
  const portalUrl = `${BASE_URL}/meine-buchung`;

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      vielen Dank f\u00fcr Ihre Anfrage! Wir pr\u00fcfen die Verf\u00fcgbarkeit und melden uns
      in K\u00fcrze mit einer Best\u00e4tigung bei Ihnen.
    </p>

    <!-- Booking reference -->
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:${GOLD};color:#ffffff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:6px;letter-spacing:1.5px;">
        ANFRAGE-NR. ${escapeHtml(ref)}
      </span>
    </div>

    ${sectionHeading("Angefragte Buchung")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Preis\u00fcbersicht")}
    ${priceTable(booking)}

    ${ctaButton("Meine Anfrage ansehen", portalUrl)}

    <p style="font-size:12px;color:${LIGHT_GRAY};line-height:1.6;margin:20px 0 0;text-align:center;">
      Mit Ihrer Anfrage akzeptieren Sie unsere
      <a href="${BASE_URL}/agb" style="color:${GOLD};text-decoration:underline;">AGB &amp; Buchungsbedingungen</a>.
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Ihre Anfrage ${escapeHtml(apartment.name)} \u2013 Nr. ${ref}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Ihre Anfrage \u2013 ${escapeHtml(apartment.name)} \u2013 ${formatDate(booking.checkIn)} bis ${formatDate(booking.checkOut)}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendBookingConfirmed (sent when admin confirms the booking)
// ---------------------------------------------------------------------------

export async function sendBookingConfirmed(
  booking: BookingData,
  apartment: Apartment,
  options?: {
    bankDetails?: BankDetails;
    portalUrl?: string;
  }
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);
  const portalUrl = options?.portalUrl
    ? `${BASE_URL}${options.portalUrl}`
    : `${BASE_URL}/meine-buchung`;

  let paymentSection = "";
  if (options?.bankDetails) {
    const hasDeposit = booking.depositAmount && booking.depositAmount < booking.totalPrice;

    if (hasDeposit) {
      // Split payment: deposit now, remainder later
      const depositDueFormatted = booking.depositDueDate
        ? formatDate(new Date(booking.depositDueDate + "T00:00:00Z"))
        : "innerhalb von 7 Tagen";
      const remainderDueFormatted = booking.remainderDueDate
        ? formatDate(new Date(booking.remainderDueDate + "T00:00:00Z"))
        : "30 Tage vor Anreise";

      paymentSection = `
        ${sectionHeading("Zahlung")}
        <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 16px;">
          Die Zahlung erfolgt in zwei Schritten:
        </p>

        <div style="background:${CARD_BG};border-radius:10px;padding:16px 24px;margin:0 0 12px;border-left:4px solid ${GOLD};">
          <p style="margin:0 0 4px;font-size:13px;color:${GRAY};text-transform:uppercase;letter-spacing:1px;font-weight:600;">1. Anzahlung (30%)</p>
          <p style="margin:0;font-size:22px;font-weight:700;color:${DARK};">${formatCurrency(booking.depositAmount!)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${GRAY};">F\u00e4llig bis ${depositDueFormatted}</p>
        </div>

        <div style="background:${CARD_BG};border-radius:10px;padding:16px 24px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:13px;color:${GRAY};text-transform:uppercase;letter-spacing:1px;font-weight:600;">2. Restbetrag (70%)</p>
          <p style="margin:0;font-size:22px;font-weight:700;color:${DARK};">${formatCurrency(booking.remainderAmount || 0)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${GRAY};">F\u00e4llig bis ${remainderDueFormatted}</p>
        </div>

        <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 8px;">
          Bitte \u00fcberweisen Sie unter Angabe des Verwendungszwecks auf folgendes Konto:
        </p>
        ${bankDetailsBlock(options.bankDetails, ref, booking.depositAmount!)}
      `;
    } else {
      // Full payment due immediately
      paymentSection = `
        ${sectionHeading("Zahlung")}
        <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 8px;">
          Da Ihre Anreise in weniger als 30 Tagen stattfindet, ist der <strong>Gesamtbetrag sofort f\u00e4llig</strong>.
          Bitte \u00fcberweisen Sie unter Angabe des Verwendungszwecks auf folgendes Konto:
        </p>
        ${bankDetailsBlock(options.bankDetails, ref, booking.totalPrice)}
      `;
    }
  }

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      <strong>Gro\u00dfartige Neuigkeiten!</strong> Ihre Buchung im Ferienhaus Rita ist best\u00e4tigt.
      Wir freuen uns sehr auf Ihren Besuch!
    </p>

    <!-- Booking reference -->
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:${GOLD};color:#ffffff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:6px;letter-spacing:1.5px;">
        BUCHUNGSNR. ${escapeHtml(ref)}
      </span>
    </div>

    ${sectionHeading("Buchungsdetails")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Preis\u00fcbersicht")}
    ${priceTable(booking)}

    ${paymentSection}

    ${ctaButton("Meine Buchung ansehen", portalUrl)}

    <p style="font-size:12px;color:${LIGHT_GRAY};line-height:1.6;margin:20px 0 0;text-align:center;">
      Es gelten unsere
      <a href="${BASE_URL}/agb" style="color:${GOLD};text-decoration:underline;">Buchungsbedingungen &amp; Hausregeln</a>.
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Buchungsbest\u00e4tigung ${escapeHtml(apartment.name)} \u2013 Buchungsnr. ${ref}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Buchungsbest\u00e4tigung \u2013 ${escapeHtml(apartment.name)} \u2013 ${formatDate(booking.checkIn)} bis ${formatDate(booking.checkOut)}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendBookingNotification (admin)
// ---------------------------------------------------------------------------

export async function sendBookingNotification(
  booking: BookingData,
  apartment: Apartment
): Promise<void> {
  const transporter = createTransporter();

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${DARK};">Neue Anfrage</h2>
    <p style="color:${GRAY};font-size:14px;margin:0 0 24px;">
      Eine neue Buchungsanfrage ist eingegangen. Bitte pr\u00fcfen und best\u00e4tigen Sie diese im Admin-Bereich.
    </p>

    ${sectionHeading("Gastdaten")}
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      ${detailRow("Name", `${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}`, { bold: true })}
      <tr>
        <td style="padding:7px 0;color:${GRAY};font-size:14px;">E-Mail</td>
        <td style="padding:7px 0;font-size:14px;font-weight:400;color:${DARK};"><a href="mailto:${escapeHtml(booking.email)}" style="color:${GOLD};text-decoration:none;">${escapeHtml(booking.email)}</a></td>
      </tr>
      <tr>
        <td style="padding:7px 0;color:${GRAY};font-size:14px;">Telefon</td>
        <td style="padding:7px 0;font-size:14px;font-weight:400;color:${DARK};"><a href="tel:${escapeHtml(booking.phone)}" style="color:${GOLD};text-decoration:none;">${escapeHtml(booking.phone)}</a></td>
      </tr>
      ${detailRow("Adresse", `${escapeHtml(booking.street)}, ${escapeHtml(booking.zip)} ${escapeHtml(booking.city)}, ${escapeHtml(booking.country)}`)}
      ${booking.notes ? detailRow("Bemerkungen", escapeHtml(booking.notes)) : ""}
    </table>

    ${sectionHeading("Buchungsdetails")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Preis\u00fcbersicht")}
    ${priceTable(booking)}
  `;

  const html = emailBaseLayout(
    content,
    `Neue Anfrage: ${apartment.name} \u2013 ${booking.firstName} ${booking.lastName}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `Neue Anfrage: ${escapeHtml(apartment.name)} \u2013 ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)} (${formatDate(booking.checkIn)} \u2013 ${formatDate(booking.checkOut)})`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendContactNotification (admin)
// ---------------------------------------------------------------------------

export async function sendContactNotification(message: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const transporter = createTransporter();

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${DARK};">Neue Kontaktanfrage</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
      ${detailRow("Name", escapeHtml(message.name), { bold: true })}
      <tr>
        <td style="padding:7px 0;color:${GRAY};font-size:14px;">E-Mail</td>
        <td style="padding:7px 0;font-size:14px;color:${DARK};"><a href="mailto:${escapeHtml(message.email)}" style="color:${GOLD};text-decoration:none;">${escapeHtml(message.email)}</a></td>
      </tr>
      ${message.phone ? `
      <tr>
        <td style="padding:7px 0;color:${GRAY};font-size:14px;">Telefon</td>
        <td style="padding:7px 0;font-size:14px;color:${DARK};">${escapeHtml(message.phone)}</td>
      </tr>` : ""}
      ${message.subject ? detailRow("Betreff", escapeHtml(message.subject)) : ""}
    </table>
    <div style="margin-top:16px;padding:16px;background:${CARD_BG};border-radius:8px;">
      <p style="margin:0;font-size:14px;color:${DARK};white-space:pre-wrap;line-height:1.6;">${escapeHtml(message.message)}</p>
    </div>
  `;

  const html = emailBaseLayout(
    content,
    `Kontaktanfrage von ${message.name}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFICATION_EMAIL,
    replyTo: message.email,
    subject: `Kontaktanfrage: ${escapeHtml(message.subject || "Allgemeine Anfrage")} \u2013 ${escapeHtml(message.name)}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendCustomEmail
// ---------------------------------------------------------------------------

export async function sendCustomEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const transporter = createTransporter();

  const content = `
    <div style="font-size:14px;color:${DARK};line-height:1.7;">
      ${body.replace(/\n/g, "<br>")}
    </div>
    ${signoff()}
  `;

  const html = emailBaseLayout(content);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    replyTo: process.env.SMTP_USER,
    subject,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendPaymentReminder
// ---------------------------------------------------------------------------

export async function sendPaymentReminder(
  booking: BookingData,
  apartment: Apartment,
  bankDetails: BankDetails,
  outstandingAmount: number
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      wir freuen uns auf Ihren Besuch im Ferienhaus Rita! Gerne m\u00f6chten wir Sie
      daran erinnern, dass f\u00fcr Ihre Buchung noch ein offener Betrag besteht.
    </p>

    <!-- Outstanding amount -->
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:${CARD_BG};border:2px solid ${GOLD};border-radius:10px;padding:20px 36px;">
        <p style="margin:0 0 4px;font-size:12px;color:${GRAY};text-transform:uppercase;letter-spacing:1.5px;">Offener Betrag</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:${DARK};">${formatCurrency(outstandingAmount)}</p>
      </div>
    </div>

    ${sectionHeading("Buchungs\u00fcbersicht")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Zahlungsinformationen")}
    <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 8px;">
      Bitte \u00fcberweisen Sie den offenen Betrag unter Angabe des Verwendungszwecks auf folgendes Konto:
    </p>
    ${bankDetailsBlock(bankDetails, ref, outstandingAmount)}

    <p style="font-size:13px;color:${GRAY};line-height:1.6;margin:16px 0 0;">
      Sollte sich Ihre Zahlung mit dieser Erinnerung \u00fcberschnitten haben, bitten wir Sie,
      diese Nachricht als gegenstandslos zu betrachten.
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Zahlungserinnerung \u2013 Buchung ${ref}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Zahlungserinnerung \u2013 Buchung ${ref} \u2013 Ferienhaus Rita`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendDepositReminder
// ---------------------------------------------------------------------------

export async function sendDepositReminder(
  booking: BookingData,
  apartment: Apartment,
  bankDetails: BankDetails,
  depositAmount: number,
  dueDate: string
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);

  const formattedDue = formatDate(new Date(dueDate + "T00:00:00Z"));

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      wir freuen uns auf Ihren Besuch im Ferienhaus Rita! Gerne m\u00f6chten wir Sie
      an die f\u00e4llige <strong>Anzahlung</strong> f\u00fcr Ihre Buchung erinnern.
    </p>

    <!-- Deposit amount -->
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:${CARD_BG};border:2px solid ${GOLD};border-radius:10px;padding:20px 36px;">
        <p style="margin:0 0 4px;font-size:12px;color:${GRAY};text-transform:uppercase;letter-spacing:1.5px;">Anzahlung (30%)</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:${DARK};">${formatCurrency(depositAmount)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:${GRAY};">F\u00e4llig bis ${formattedDue}</p>
      </div>
    </div>

    ${sectionHeading("Buchungs\u00fcbersicht")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Zahlungsinformationen")}
    <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 8px;">
      Bitte \u00fcberweisen Sie die Anzahlung unter Angabe des Verwendungszwecks:
    </p>
    ${bankDetailsBlock(bankDetails, ref, depositAmount)}

    <p style="font-size:13px;color:${GRAY};line-height:1.6;margin:16px 0 0;">
      Der Restbetrag von ${formatCurrency(booking.totalPrice - depositAmount)} wird vor Ihrer Anreise f\u00e4llig.
      Sollte sich Ihre Zahlung mit dieser Erinnerung \u00fcberschnitten haben, bitten wir Sie,
      diese Nachricht als gegenstandslos zu betrachten.
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Anzahlung f\u00e4llig \u2013 Buchung ${ref}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Anzahlung f\u00e4llig \u2013 Buchung ${ref} \u2013 Ferienhaus Rita`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendRemainderReminder
// ---------------------------------------------------------------------------

export async function sendRemainderReminder(
  booking: BookingData,
  apartment: Apartment,
  bankDetails: BankDetails,
  remainderAmount: number,
  dueDate: string
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);

  const formattedDue = formatDate(new Date(dueDate + "T00:00:00Z"));

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      vielen Dank f\u00fcr Ihre Anzahlung! Gerne m\u00f6chten wir Sie an den
      f\u00e4lligen <strong>Restbetrag</strong> f\u00fcr Ihre Buchung erinnern.
    </p>

    <!-- Remainder amount -->
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:${CARD_BG};border:2px solid ${GOLD};border-radius:10px;padding:20px 36px;">
        <p style="margin:0 0 4px;font-size:12px;color:${GRAY};text-transform:uppercase;letter-spacing:1.5px;">Restbetrag</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:${DARK};">${formatCurrency(remainderAmount)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:${GRAY};">F\u00e4llig bis ${formattedDue}</p>
      </div>
    </div>

    ${sectionHeading("Buchungs\u00fcbersicht")}
    ${bookingDetailsCard(booking, apartment)}

    ${sectionHeading("Zahlungsinformationen")}
    <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:0 0 8px;">
      Bitte \u00fcberweisen Sie den Restbetrag unter Angabe des Verwendungszwecks:
    </p>
    ${bankDetailsBlock(bankDetails, ref, remainderAmount)}

    <p style="font-size:13px;color:${GRAY};line-height:1.6;margin:16px 0 0;">
      Sollte sich Ihre Zahlung mit dieser Erinnerung \u00fcberschnitten haben, bitten wir Sie,
      diese Nachricht als gegenstandslos zu betrachten.
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Restbetrag f\u00e4llig \u2013 Buchung ${ref}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Restbetrag f\u00e4llig \u2013 Buchung ${ref} \u2013 Ferienhaus Rita`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendCheckinInfo
// ---------------------------------------------------------------------------

export async function sendCheckinInfo(
  booking: BookingData,
  apartment: Apartment,
  checkinInfo: CheckinInfo
): Promise<void> {
  const transporter = createTransporter();
  const ref = paymentReference(booking.id);

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>

    <h2 style="margin:0 0 8px;font-size:20px;color:${DARK};">In wenigen Tagen geht&rsquo;s los!</h2>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      Ihr Aufenthalt im Ferienhaus Rita r\u00fcckt n\u00e4her und wir m\u00f6chten Ihnen
      alle wichtigen Informationen f\u00fcr Ihre Anreise mitteilen.
    </p>

    <!-- Check-in highlight -->
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:${GOLD};border-radius:10px;padding:20px 36px;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;">Check-in</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${formatDate(booking.checkIn)} ab 16:00 Uhr</p>
      </div>
    </div>

    ${sectionHeading("Adresse & Anfahrt")}
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${DARK};">${escapeHtml(checkinInfo.address)}</p>
      <p style="margin:0;font-size:14px;color:${GRAY};line-height:1.6;">${escapeHtml(checkinInfo.directions)}</p>
    </div>

    ${sectionHeading("Schl\u00fcssel\u00fcbergabe")}
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:${DARK};line-height:1.6;">${escapeHtml(checkinInfo.key_handoff)}</p>
    </div>

    ${sectionHeading("Parken")}
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:${DARK};line-height:1.6;">${escapeHtml(checkinInfo.parking)}</p>
    </div>

    ${sectionHeading("Hausordnung")}
    <div style="background:${CARD_BG};border-radius:10px;padding:20px 24px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:${DARK};line-height:1.6;white-space:pre-wrap;">${escapeHtml(checkinInfo.house_rules)}</p>
    </div>

    ${sectionHeading("Ihre Buchung")}
    ${bookingDetailsCard(booking, apartment)}

    <p style="font-size:14px;color:${GRAY};line-height:1.6;margin:20px 0 0;">
      Bei Fragen stehen wir Ihnen jederzeit zur Verf\u00fcgung &ndash; antworten Sie einfach
      auf diese E-Mail oder rufen Sie uns an unter
      <a href="${contact.phoneHref}" style="color:${GOLD};text-decoration:none;font-weight:600;">${contact.phone}</a>.
    </p>

    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:20px 0 0;">
      Wir freuen uns auf Sie!
    </p>

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    `Anreise-Informationen f\u00fcr Ihren Aufenthalt \u2013 ${formatDate(booking.checkIn)}`
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Anreise-Informationen \u2013 ${escapeHtml(apartment.name)} \u2013 ${formatDate(booking.checkIn)}`,
    html,
  });
}

// ---------------------------------------------------------------------------
// sendThankYou
// ---------------------------------------------------------------------------

export async function sendThankYou(
  booking: BookingData,
  apartment: Apartment,
  reviewLink?: string
): Promise<void> {
  const transporter = createTransporter();

  const reviewSection = reviewLink
    ? `
      <p style="font-size:14px;color:${DARK};line-height:1.7;margin:20px 0 8px;">
        Wir w\u00fcrden uns sehr freuen, wenn Sie Ihre Erfahrung mit anderen Urlaubern teilen:
      </p>
      ${ctaButton("Bewerten Sie uns auf Google", reviewLink)}
    `
    : "";

  const content = `
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:0 0 20px;">
      Hallo ${escapeHtml(booking.firstName)},
    </p>

    <h2 style="margin:0 0 12px;font-size:20px;color:${DARK};">Vielen Dank f\u00fcr Ihren Besuch!</h2>
    <p style="font-size:14px;color:${DARK};line-height:1.7;margin:0 0 8px;">
      Wir hoffen, Sie hatten eine wundersch\u00f6ne Zeit im Ferienhaus Rita in Kals am
      Gro\u00dfglockner und konnten Ihren Aufenthalt in vollen Z\u00fcgen genie\u00dfen.
    </p>

    ${bookingDetailsCard(booking, apartment)}

    ${reviewSection}

    <div style="text-align:center;margin:28px 0 8px;">
      <div style="display:inline-block;width:40px;height:2px;background-color:${GOLD};border-radius:1px;"></div>
    </div>

    <p style="font-size:15px;color:${DARK};line-height:1.7;margin:12px 0 0;text-align:center;font-weight:600;">
      Bis zum n\u00e4chsten Mal!
    </p>
    <p style="font-size:14px;color:${GRAY};line-height:1.7;margin:8px 0 0;text-align:center;">
      Planen Sie schon Ihren n\u00e4chsten Urlaub?
    </p>
    ${ctaButton("Ferienhaus Rita besuchen", BASE_URL)}

    ${signoff()}
  `;

  const html = emailBaseLayout(
    content,
    "Vielen Dank f\u00fcr Ihren Besuch im Ferienhaus Rita!"
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Vielen Dank f\u00fcr Ihren Besuch \u2013 Ferienhaus Rita`,
    html,
  });
}
