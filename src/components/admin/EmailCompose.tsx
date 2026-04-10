"use client";

import { useState } from "react";
import { sendGuestEmail } from "@/app/(admin)/admin/actions";

interface BankDetails {
  iban?: string;
  bic?: string;
  account_holder?: string;
  bank_name?: string;
}

interface EmailComposeProps {
  bookingId: string;
  guestEmail: string;
  guestName: string;
  guestFirstName: string;
  bookingRef: string;
  totalPrice: number;
  depositAmount: number;
  remainderAmount: number;
  checkIn: string;
  checkOut: string;
  apartmentName: string;
  bankDetails: BankDetails | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildBankBlock(bank: BankDetails | null, ref: string, amount?: number): string {
  if (!bank?.iban) return "[Bankdaten nicht hinterlegt – bitte in Einstellungen ergänzen]";
  const lines = [
    `Empfänger: ${bank.account_holder || "–"}`,
    `IBAN: ${bank.iban}`,
  ];
  if (bank.bic) lines.push(`BIC: ${bank.bic}`);
  if (bank.bank_name) lines.push(`Bank: ${bank.bank_name}`);
  lines.push(`Verwendungszweck: ${ref}`);
  if (amount) lines.push(`Betrag: ${formatCurrency(amount)}`);
  return lines.join("\n");
}

export default function EmailCompose({
  bookingId,
  guestEmail,
  guestName,
  guestFirstName,
  bookingRef,
  totalPrice,
  depositAmount,
  remainderAmount,
  checkIn,
  checkOut,
  apartmentName,
  bankDetails,
}: EmailComposeProps) {
  const hasDeposit = depositAmount > 0 && depositAmount < totalPrice;

  const templates = [
    {
      label: "Anreise-Informationen",
      subject: `Anreise-Informationen – ${apartmentName} – ${formatDate(checkIn)}`,
      body: `Hallo ${guestFirstName},

wir freuen uns auf Ihren bevorstehenden Aufenthalt im Ferienhaus Rita!

Hier einige wichtige Informationen zur Anreise:

• Check-in: ${formatDate(checkIn)} ab 16:00 Uhr
• Check-out: ${formatDate(checkOut)} bis 10:00 Uhr
• Die Schlüsselübergabe erfolgt vor Ort
• Parkplatz steht direkt am Haus zur Verfügung

Wohnung: ${apartmentName}
Buchungsnr.: ${bookingRef}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.`,
    },
    {
      label: "Zahlungserinnerung",
      subject: `Zahlungserinnerung – Buchung ${bookingRef} – Ferienhaus Rita`,
      body: hasDeposit
        ? `Hallo ${guestFirstName},

wir möchten Sie freundlich an die ausstehende Zahlung für Ihre Buchung erinnern.

Buchungsnr.: ${bookingRef}
Wohnung: ${apartmentName}
Zeitraum: ${formatDate(checkIn)} – ${formatDate(checkOut)}

Anzahlung (30%): ${formatCurrency(depositAmount)}
Restbetrag (70%): ${formatCurrency(remainderAmount)}

Bitte überweisen Sie den fälligen Betrag auf folgendes Konto:

${buildBankBlock(bankDetails, bookingRef)}

Sollte sich Ihre Zahlung mit dieser Erinnerung überschnitten haben, bitten wir Sie, diese Nachricht als gegenstandslos zu betrachten.`
        : `Hallo ${guestFirstName},

wir möchten Sie freundlich an die ausstehende Zahlung für Ihre Buchung erinnern.

Buchungsnr.: ${bookingRef}
Wohnung: ${apartmentName}
Zeitraum: ${formatDate(checkIn)} – ${formatDate(checkOut)}
Gesamtbetrag: ${formatCurrency(totalPrice)}

Bitte überweisen Sie den Betrag auf folgendes Konto:

${buildBankBlock(bankDetails, bookingRef, totalPrice)}

Sollte sich Ihre Zahlung mit dieser Erinnerung überschnitten haben, bitten wir Sie, diese Nachricht als gegenstandslos zu betrachten.`,
    },
    {
      label: "Stornierungsbestätigung",
      subject: `Stornierungsbestätigung – Buchung ${bookingRef} – Ferienhaus Rita`,
      body: `Hallo ${guestFirstName},

hiermit bestätigen wir die Stornierung Ihrer Buchung.

Buchungsnr.: ${bookingRef}
Wohnung: ${apartmentName}
Zeitraum: ${formatDate(checkIn)} – ${formatDate(checkOut)}

Wir würden uns freuen, Sie ein anderes Mal bei uns begrüßen zu dürfen.`,
    },
    {
      label: "Freitext",
      subject: "",
      body: `Hallo ${guestFirstName},

`,
    },
  ];

  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleTemplate = (index: number) => {
    const t = templates[index];
    setSubject(t.subject);
    setBody(t.body);
    setExpanded(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setLoading(true);
    setMessage(null);

    const result = await sendGuestEmail(bookingId, guestEmail, subject, body);

    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "E-Mail wurde gesendet" });
      setSubject("");
      setBody("");
      setExpanded(false);
    } else {
      setMessage({ type: "error", text: result.error || "Fehler beim Senden" });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">
          E-Mail an Gast
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          An: {guestName} ({guestEmail})
        </p>
      </div>

      {/* Template buttons */}
      {!expanded && (
        <div className="p-4 space-y-2">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => handleTemplate(i)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Compose form */}
      {expanded && (
        <form onSubmit={handleSend} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Betreff
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              placeholder="Betreff..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Nachricht
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 resize-none font-mono text-xs leading-relaxed"
              placeholder="Nachricht eingeben..."
              required
            />
          </div>
          <p className="text-xs text-stone-400">
            Die Signatur &quot;Herzliche Grüße, Ihr Team vom Ferienhaus Rita&quot; wird automatisch angehängt.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading || !subject.trim() || !body.trim()}
              className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Wird gesendet..." : "Senden"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setSubject("");
                setBody("");
                setMessage(null);
              }}
              className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Feedback */}
      {message && (
        <div
          className={`mx-4 mb-4 rounded-xl p-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
