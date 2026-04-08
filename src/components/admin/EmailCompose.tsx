"use client";

import { useState } from "react";
import { sendGuestEmail } from "@/app/(admin)/admin/actions";

const templates = [
  {
    label: "Anreise-Informationen",
    subject: "Anreise-Informationen für Ihren Aufenthalt",
    body: `Liebe/r Gast,

wir freuen uns auf Ihren bevorstehenden Aufenthalt im Ferienhaus Rita!

Hier einige wichtige Informationen zur Anreise:

• Check-in: Ab 15:00 Uhr
• Die Schlüsselübergabe erfolgt vor Ort
• Parkplatz steht direkt am Haus zur Verfügung

Bei Fragen stehen wir Ihnen gerne zur Verfügung.`,
  },
  {
    label: "Zahlungserinnerung",
    subject: "Zahlungserinnerung – Ferienhaus Rita",
    body: `Liebe/r Gast,

wir möchten Sie freundlich an die ausstehende Zahlung für Ihre Buchung erinnern.

Bitte überweisen Sie den Betrag auf folgendes Konto:
[Kontodaten einfügen]

Verwendungszweck: Ihre Buchungsnummer

Bei Fragen stehen wir Ihnen gerne zur Verfügung.`,
  },
  {
    label: "Stornierungsbestätigung",
    subject: "Stornierungsbestätigung – Ferienhaus Rita",
    body: `Liebe/r Gast,

hiermit bestätigen wir die Stornierung Ihrer Buchung.

Wir würden uns freuen, Sie ein anderes Mal bei uns begrüßen zu dürfen.`,
  },
  {
    label: "Freitext",
    subject: "",
    body: "",
  },
];

interface EmailComposeProps {
  bookingId: string;
  guestEmail: string;
  guestName: string;
}

export default function EmailCompose({
  bookingId,
  guestEmail,
  guestName,
}: EmailComposeProps) {
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
              rows={8}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 resize-none"
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
