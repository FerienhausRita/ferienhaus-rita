import nodemailer from "nodemailer";
import { formatCurrency, formatDate } from "@/lib/pricing";
import { Apartment } from "@/data/apartments";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  vatAmount: number;
}

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

function bookingDetailsHtml(booking: BookingData, apartment: Apartment): string {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 0;color:#78716c;">Wohnung</td>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(apartment.name)} (${apartment.size} m²)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#78716c;">Anreise</td>
        <td style="padding:8px 0;font-weight:600;">${formatDate(booking.checkIn)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#78716c;">Abreise</td>
        <td style="padding:8px 0;font-weight:600;">${formatDate(booking.checkOut)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#78716c;">Nächte</td>
        <td style="padding:8px 0;font-weight:600;">${booking.nights}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#78716c;">Gäste</td>
        <td style="padding:8px 0;font-weight:600;">${booking.adults} Erwachsene${booking.children > 0 ? `, ${booking.children} Kinder` : ""}${booking.dogs > 0 ? `, ${booking.dogs} Hund${booking.dogs > 1 ? "e" : ""}` : ""}</td>
      </tr>
      <tr style="border-top:1px solid #e7e5e4;">
        <td style="padding:8px 0;color:#78716c;">${booking.nights} × Übernachtung</td>
        <td style="padding:8px 0;text-align:right;">${formatCurrency(booking.pricePerNight * booking.nights)}</td>
      </tr>
      ${booking.extraGuestsTotal > 0 ? `
      <tr>
        <td style="padding:8px 0;color:#78716c;">Zusatzgäste</td>
        <td style="padding:8px 0;text-align:right;">${formatCurrency(booking.extraGuestsTotal)}</td>
      </tr>` : ""}
      ${booking.dogsTotal > 0 ? `
      <tr>
        <td style="padding:8px 0;color:#78716c;">Hund${booking.dogs > 1 ? "e" : ""}</td>
        <td style="padding:8px 0;text-align:right;">${formatCurrency(booking.dogsTotal)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:8px 0;color:#78716c;">Endreinigung</td>
        <td style="padding:8px 0;text-align:right;">${formatCurrency(booking.cleaningFee)}</td>
      </tr>
      <tr style="border-top:2px solid #292524;">
        <td style="padding:12px 0;font-weight:700;font-size:16px;">Gesamtpreis</td>
        <td style="padding:12px 0;font-weight:700;font-size:16px;text-align:right;">${formatCurrency(booking.totalPrice)}</td>
      </tr>
      ${booking.vatAmount > 0 ? `
      <tr>
        <td style="padding:4px 0;color:#a8a29e;font-size:12px;">Inkl. 10% MwSt</td>
        <td style="padding:4px 0;color:#a8a29e;font-size:12px;text-align:right;">${formatCurrency(booking.vatAmount)}</td>
      </tr>` : ""}
    </table>
  `;
}

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#fafaf9;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="margin:0;font-size:24px;color:#292524;">Ferienhaus Rita</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#78716c;letter-spacing:2px;text-transform:uppercase;">Kals am Großglockner</p>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e7e5e4;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:32px;font-size:12px;color:#a8a29e;">
      <p>Ferienhaus Rita · Kals am Großglockner · Österreich</p>
    </div>
  </div>
</body>
</html>
`;

export async function sendBookingConfirmation(
  booking: BookingData,
  apartment: Apartment
): Promise<void> {
  const transporter = createTransporter();

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#292524;">Vielen Dank für Ihre Buchungsanfrage!</h2>
    <p style="color:#78716c;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Liebe/r ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)},<br><br>
      wir haben Ihre Buchungsanfrage erhalten und melden uns innerhalb von 24 Stunden mit einer Bestätigung bei Ihnen.
    </p>
    <h3 style="margin:0 0 16px;font-size:16px;color:#292524;">Ihre Buchungsdetails</h3>
    ${bookingDetailsHtml(booking, apartment)}
    <div style="margin-top:24px;padding:16px;background:#f6f7f4;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#5e6a4d;">
        <strong>Buchungsnummer:</strong> ${booking.id.slice(0, 8).toUpperCase()}<br>
        Bitte geben Sie diese Nummer bei Rückfragen an.
      </p>
    </div>
    <p style="color:#78716c;font-size:14px;line-height:1.6;margin:24px 0 0;">
      Herzliche Grüße,<br>
      Ihr Team vom Ferienhaus Rita
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: booking.email,
    subject: `Buchungsanfrage ${escapeHtml(apartment.name)} – ${formatDate(booking.checkIn)} bis ${formatDate(booking.checkOut)}`,
    html,
  });
}

export async function sendBookingNotification(
  booking: BookingData,
  apartment: Apartment
): Promise<void> {
  const transporter = createTransporter();

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#292524;">Neue Buchungsanfrage</h2>
    <p style="color:#78716c;font-size:14px;margin:0 0 24px;">
      Eine neue Buchungsanfrage ist eingegangen.
    </p>
    <h3 style="margin:0 0 12px;font-size:16px;color:#292524;">Gastdaten</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr><td style="padding:4px 0;color:#78716c;">Name</td><td style="padding:4px 0;">${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</td></tr>
      <tr><td style="padding:4px 0;color:#78716c;">E-Mail</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#78716c;">Telefon</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(booking.phone)}">${escapeHtml(booking.phone)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#78716c;">Adresse</td><td style="padding:4px 0;">${escapeHtml(booking.street)}, ${escapeHtml(booking.zip)} ${escapeHtml(booking.city)}, ${escapeHtml(booking.country)}</td></tr>
      ${booking.notes ? `<tr><td style="padding:4px 0;color:#78716c;">Bemerkungen</td><td style="padding:4px 0;">${escapeHtml(booking.notes)}</td></tr>` : ""}
    </table>
    <h3 style="margin:0 0 12px;font-size:16px;color:#292524;">Buchungsdetails</h3>
    ${bookingDetailsHtml(booking, apartment)}
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `Neue Buchung: ${escapeHtml(apartment.name)} – ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)} (${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)})`,
    html,
  });
}

export async function sendContactNotification(message: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const transporter = createTransporter();

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#292524;">Neue Kontaktanfrage</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#78716c;width:100px;">Name</td><td style="padding:8px 0;">${escapeHtml(message.name)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716c;">E-Mail</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></td></tr>
      ${message.phone ? `<tr><td style="padding:8px 0;color:#78716c;">Telefon</td><td style="padding:8px 0;">${escapeHtml(message.phone)}</td></tr>` : ""}
      ${message.subject ? `<tr><td style="padding:8px 0;color:#78716c;">Betreff</td><td style="padding:8px 0;">${escapeHtml(message.subject)}</td></tr>` : ""}
    </table>
    <div style="margin-top:16px;padding:16px;background:#f5f5f4;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#292524;white-space:pre-wrap;">${escapeHtml(message.message)}</p>
    </div>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.NOTIFICATION_EMAIL,
    replyTo: message.email,
    subject: `Kontaktanfrage: ${escapeHtml(message.subject || "Allgemeine Anfrage")} – ${escapeHtml(message.name)}`,
    html,
  });
}
