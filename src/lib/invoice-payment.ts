// Zentrale, EINDEUTIGE Ableitung des Zahlungsstatus für Rechnungen.
// Eine Quelle der Wahrheit — von der PDF-Vorlage (Anzeige) UND der QR-Erzeugung
// genutzt, damit angezeigter Betrag, Überweisungsabschnitt und GiroCode niemals
// widersprüchlich sind. Rein (keine Server-Imports), damit testbar.

export type InvoicePaymentStatus = "open" | "paid" | "partially_paid" | "cancelled";

export interface InvoicePaymentView {
  status: InvoicePaymentStatus;
  /** Plattformname bei Plattform-Zahlung (z. B. "Booking.com"), sonst null. */
  provider: string | null;
  /** Zahlungsdatum (YYYY-MM-DD), wenn bekannt, sonst null. */
  paymentDate: string | null;
  total: number;
  amountPaid: number;
  amountOutstanding: number;
}

export interface InvoicePaymentInput {
  total_price?: number | string | null;
  payment_status?: string | null;
  source_channel?: string | null;
  payout_confirmed_at?: string | null;
  deposit_amount?: number | string | null;
  deposit_paid_at?: string | null;
  remainder_amount?: number | string | null;
  remainder_paid_at?: string | null;
  invoice_cancelled_at?: string | null;
}

export interface InvoicePayment {
  amount: number | string;
  paid_at?: string | null;
  applies_to?: string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// Direkte Kanäle: Gast zahlt unmittelbar ans Ferienhaus (kein Plattform-Einzug).
const DIRECT_CHANNELS = new Set([
  "website",
  "direkt",
  "direktbuchung",
  "telefon",
  "e-mail",
  "email",
  "vor ort",
  "walk-in",
  "osttirol",
]);

function isPlatformChannelName(ch?: string | null): boolean {
  if (!ch) return false;
  return !DIRECT_CHANNELS.has(ch.trim().toLowerCase());
}

function isoDate(s?: string | null): string | null {
  if (!s) return null;
  return String(s).slice(0, 10);
}

/**
 * Leitet den Zahlungsstatus zentral ab. Maßgeblich ist, ob die Zahlung TATSÄCHLICH
 * erfolgt ist (Plattform-Einzug ODER Ledger/Flags) — NICHT der Buchungskanal allein.
 */
export function deriveInvoicePayment(
  booking: InvoicePaymentInput,
  payments: InvoicePayment[] = [],
  opts: { documentType?: "invoice" | "storno" | "correction"; snapshotTotal?: number | null } = {}
): InvoicePaymentView {
  const total = r2(Number(opts.snapshotTotal ?? booking.total_price ?? 0));
  const documentType = opts.documentType ?? "invoice";
  const status0 = (booking.payment_status ?? "").toLowerCase();

  const base = (extra: Partial<InvoicePaymentView>): InvoicePaymentView => ({
    status: "open",
    provider: null,
    paymentDate: null,
    total,
    amountPaid: 0,
    amountOutstanding: total,
    ...extra,
  });

  // 1) Storno-/Korrektur-Dokument, stornierte Originalrechnung oder Rückerstattung
  //    → storniert/gutgeschrieben (keine Zahlungsaufforderung, kein QR).
  if (
    documentType === "storno" ||
    documentType === "correction" ||
    booking.invoice_cancelled_at ||
    status0 === "refunded" ||
    status0 === "cancelled"
  ) {
    return base({ status: "cancelled", amountOutstanding: 0 });
  }

  // 2) Plattform hat die Zahlung des Gastes bereits eingezogen.
  //    platform_pending = Plattform hat kassiert, Host wartet nur noch auf Auszahlung;
  //    payout_confirmed_at = Auszahlung bestätigt. In beiden Fällen hat der GAST bezahlt.
  const platformCollected =
    status0 === "platform_pending" || !!booking.payout_confirmed_at;
  if (platformCollected) {
    return base({
      status: "paid",
      provider: isPlatformChannelName(booking.source_channel) ? (booking.source_channel as string) : null,
      paymentDate: isoDate(booking.payout_confirmed_at),
      amountPaid: total,
      amountOutstanding: 0,
    });
  }

  const ledgerDates = payments
    .map((p) => isoDate(p.paid_at))
    .filter((d): d is string => !!d)
    .sort();
  const lastPaidDate = ledgerDates.length ? ledgerDates[ledgerDates.length - 1] : null;

  // 3) Direkt: als „paid" markiert → vollständig bezahlt (Status ist maßgeblich).
  if (status0 === "paid") {
    return base({
      status: "paid",
      paymentDate: lastPaidDate,
      amountPaid: total,
      amountOutstanding: 0,
    });
  }

  // 4) Direkt offen/teilweise: bezahlten Betrag aus Ledger (primär) bzw. Flags (Altbuchungen).
  const ledgerSum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const depFlag = booking.deposit_paid_at ? Number(booking.deposit_amount || 0) : 0;
  const remFlag = booking.remainder_paid_at ? Number(booking.remainder_amount || 0) : 0;
  let paid = ledgerSum > 0.01 ? ledgerSum : depFlag + remFlag;
  paid = r2(Math.min(Math.max(0, paid), total));
  const outstanding = r2(Math.max(0, total - paid));

  if (outstanding <= 0.01 && paid >= total - 0.01) {
    return base({ status: "paid", paymentDate: lastPaidDate, amountPaid: total, amountOutstanding: 0 });
  }
  if (paid > 0.01) {
    return base({
      status: "partially_paid",
      paymentDate: lastPaidDate,
      amountPaid: paid,
      amountOutstanding: outstanding,
    });
  }
  return base({ status: "open", amountPaid: 0, amountOutstanding: total });
}

/**
 * Plausibilitätsprüfung: liefert eine Liste von Widersprüchen (leer = konsistent).
 * Für Tests/Abschlussprüfung genutzt.
 */
export function checkInvoiceConsistency(
  pay: InvoicePaymentView,
  breakdown: { net: number; vat: number; localTax: number; positionsSum?: number }
): string[] {
  const errs: string[] = [];
  // Bei storniert/gutgeschrieben gibt es keinen offenen Betrag → Invariante entfällt.
  if (pay.status !== "cancelled" && r2(pay.amountPaid + pay.amountOutstanding) !== pay.total) {
    errs.push(`amountPaid+outstanding (${r2(pay.amountPaid + pay.amountOutstanding)}) != total (${pay.total})`);
  }
  if (r2(breakdown.net + breakdown.vat + breakdown.localTax) !== pay.total) {
    errs.push(
      `net+vat+localTax (${r2(breakdown.net + breakdown.vat + breakdown.localTax)}) != total (${pay.total})`
    );
  }
  if (pay.status === "paid" && pay.amountOutstanding > 0.001) {
    errs.push(`paid, aber amountOutstanding=${pay.amountOutstanding}`);
  }
  if ((pay.status === "cancelled" || pay.status === "paid") && showsGiroCode(pay)) {
    errs.push(`${pay.status} darf keinen GiroCode zeigen`);
  }
  if (pay.status === "open" && pay.amountPaid > 0.001) {
    errs.push(`open, aber amountPaid=${pay.amountPaid}`);
  }
  if (breakdown.positionsSum != null && r2(breakdown.positionsSum) !== pay.total) {
    errs.push(`positionsSum (${r2(breakdown.positionsSum)}) != total (${pay.total})`);
  }
  return errs;
}

/** GiroCode/Überweisung nur bei tatsächlich offenem Betrag. */
export function showsGiroCode(pay: InvoicePaymentView): boolean {
  return (
    (pay.status === "open" || pay.status === "partially_paid") &&
    pay.amountOutstanding > 0.01
  );
}
