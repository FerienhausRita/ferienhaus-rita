"use client";

import { useState } from "react";
import { subscribeToWaitlist } from "@/lib/waitlist-actions";

interface WaitlistCardProps {
  checkIn: string;
  checkOut: string;
  apartmentsData: Array<{ id: string; name: string }>;
}

export default function WaitlistCard({
  checkIn,
  checkOut,
  apartmentsData,
}: WaitlistCardProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [apartmentId, setApartmentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const r = await subscribeToWaitlist({
      firstName,
      lastName,
      email,
      phone,
      checkIn,
      checkOut,
      apartmentId: apartmentId || null,
    });
    setSubmitting(false);
    if (r.success) {
      setDone(true);
    } else {
      setError(r.error ?? "Konnte nicht eintragen");
    }
  };

  if (done) {
    return (
      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <p className="text-emerald-800 font-medium">
          Sie stehen jetzt auf der Warteliste — wir benachrichtigen Sie per E-Mail,
          sobald sich eine passende Wohnung in diesem Zeitraum freigibt.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-center">
        <p className="text-stone-700 mb-1 font-medium">
          Trotzdem in diesem Zeitraum bei uns?
        </p>
        <p className="text-sm text-stone-500 mb-4">
          Tragen Sie sich auf die Warteliste — sobald eine Wohnung frei wird,
          melden wir uns.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Auf die Warteliste setzen
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e] transition-all";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-stone-900">
          Auf die Warteliste eintragen
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          Wir melden uns sobald in Ihrem Wunschzeitraum eine Wohnung frei wird.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Vorname *
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Nachname *
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            E-Mail *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Telefon *
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">
            Bevorzugte Wohnung
          </label>
          <select
            value={apartmentId}
            onChange={(e) => setApartmentId(e.target.value)}
            className={inputClass}
          >
            <option value="">Egal — alle Wohnungen</option>
            {apartmentsData.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Zeitraum: <strong>{new Date(checkIn).toLocaleDateString("de-AT")}</strong> —{" "}
        <strong>{new Date(checkOut).toLocaleDateString("de-AT")}</strong>
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting ? "Wird gesendet…" : "Eintragen"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
