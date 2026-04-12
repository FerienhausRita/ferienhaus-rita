"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateBookingStatus,
  updatePaymentStatus,
  resendConfirmation,
  deleteBooking,
} from "@/app/(admin)/admin/actions";

const statusTransitions: Record<string, { label: string; next: string; className: string }[]> = {
  pending: [
    { label: "Bestätigen", next: "confirmed", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { label: "Stornieren", next: "cancelled", className: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
  confirmed: [
    { label: "Abschließen", next: "completed", className: "bg-stone-800 hover:bg-stone-900 text-white" },
    { label: "Stornieren", next: "cancelled", className: "bg-red-100 hover:bg-red-200 text-red-700" },
  ],
  completed: [],
  cancelled: [
    { label: "Wieder öffnen", next: "pending", className: "bg-amber-100 hover:bg-amber-200 text-amber-700" },
  ],
};

const paymentOptions = [
  { value: "unpaid", label: "Offen", className: "text-red-600" },
  { value: "deposit_paid", label: "Anzahlung", className: "text-amber-600" },
  { value: "paid", label: "Bezahlt", className: "text-emerald-600" },
  { value: "refunded", label: "Erstattet", className: "text-stone-500" },
];

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  confirmationSentAt: string | null;
  guestEmail: string;
  guestPhone: string;
}

export default function BookingActions({
  bookingId,
  currentStatus,
  currentPaymentStatus,
  confirmationSentAt,
  guestEmail,
  guestPhone,
}: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (
      newStatus === "cancelled" &&
      !confirm("Buchung wirklich stornieren?")
    )
      return;

    setLoading(`status-${newStatus}`);
    setMessage(null);

    const result = await updateBookingStatus(
      bookingId,
      newStatus as "pending" | "confirmed" | "cancelled" | "completed"
    );

    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Status aktualisiert" });
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handlePaymentChange = async (newStatus: string) => {
    setLoading("payment");
    setMessage(null);

    const result = await updatePaymentStatus(
      bookingId,
      newStatus as "unpaid" | "deposit_paid" | "paid" | "refunded"
    );

    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Zahlungsstatus aktualisiert" });
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handleResendConfirmation = async () => {
    setLoading("resend");
    setMessage(null);

    const result = await resendConfirmation(bookingId);

    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Bestätigung erneut gesendet" });
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Buchung endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    if (!confirm("Wirklich löschen? Alle zugehörigen Daten (Meldeschein, E-Mails, Zahlungen) werden ebenfalls entfernt.")) return;

    setLoading("delete");
    setMessage(null);

    const result = await deleteBooking(bookingId);

    if (result.success) {
      router.push("/admin/buchungen");
    } else {
      setLoading(null);
      setMessage({ type: "error", text: result.error || "Fehler beim Löschen" });
    }
  };

  const transitions = statusTransitions[currentStatus] ?? [];

  return (
    <>
      {/* Status Actions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm">Aktionen</h3>
          </div>
          <div className="p-5 space-y-2">
            {transitions.map((t) => (
              <button
                key={t.next}
                onClick={() => handleStatusChange(t.next)}
                disabled={loading !== null}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${t.className}`}
              >
                {loading === `status-${t.next}` ? "Wird aktualisiert..." : t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Status */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">
            Zahlungsstatus
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePaymentChange(opt.value)}
                disabled={loading !== null}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50 ${
                  currentPaymentStatus === opt.value
                    ? "border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Contact */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">
            Schnellkontakt
          </h3>
        </div>
        <div className="p-5 space-y-2">
          {guestEmail && (
            <a
              href={`mailto:${guestEmail}`}
              className="flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              E-Mail senden
            </a>
          )}
          {guestPhone && (
            <a
              href={`tel:${guestPhone}`}
              className="flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              Anrufen
            </a>
          )}
          {guestPhone && (
            <a
              href={`https://wa.me/${guestPhone.replace(/[^0-9+]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              <svg className="w-4 h-4 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              WhatsApp
            </a>
          )}
          {!guestEmail && !guestPhone && (
            <p className="text-sm text-stone-400">Keine Kontaktdaten vorhanden</p>
          )}
        </div>
      </div>

      {/* Resend Confirmation */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">
            Buchungsbestätigung
          </h3>
        </div>
        <div className="p-5">
          {confirmationSentAt && (
            <p className="text-xs text-stone-500 mb-3">
              Zuletzt gesendet:{" "}
              {new Date(confirmationSentAt).toLocaleDateString("de-AT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <button
            onClick={handleResendConfirmation}
            disabled={loading !== null}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-[#c8a96e] border border-[#c8a96e]/30 hover:bg-[#c8a96e]/5 transition-colors disabled:opacity-50"
          >
            {loading === "resend"
              ? "Wird gesendet..."
              : "Bestätigung erneut senden"}
          </button>
        </div>
      </div>

      {/* Delete Booking */}
      {(currentStatus === "cancelled" || currentStatus === "completed") && (
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="p-5">
            <button
              onClick={handleDelete}
              disabled={loading !== null}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {loading === "delete" ? "Wird gelöscht..." : "Buchung endgültig löschen"}
            </button>
            <p className="text-[11px] text-stone-400 mt-2 text-center">
              Entfernt die Buchung und alle zugehörigen Daten unwiderruflich
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </>
  );
}
