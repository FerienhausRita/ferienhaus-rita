"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingDetails } from "@/app/(admin)/admin/actions";

interface ApartmentOpt {
  id: string;
  name: string;
  maxGuests: number;
}

interface BookingDetailsEditorProps {
  bookingId: string;
  apartments: ApartmentOpt[];
  initialApartmentId: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialAdults: number;
  initialChildren: number;
  initialDogs: number;
  initialNotes: string;
  isExternalChannel: boolean;
}

export default function BookingDetailsEditor({
  bookingId,
  apartments,
  initialApartmentId,
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialDogs,
  initialNotes,
  isExternalChannel,
}: BookingDetailsEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [apartmentId, setApartmentId] = useState(initialApartmentId);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [dogs, setDogs] = useState(initialDogs);
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const datesOrAptChanged =
    apartmentId !== initialApartmentId ||
    checkIn !== initialCheckIn ||
    checkOut !== initialCheckOut;

  const priceWillRecalc =
    !isExternalChannel &&
    (datesOrAptChanged ||
      adults !== initialAdults ||
      children !== initialChildren ||
      dogs !== initialDogs);

  const handleSave = async () => {
    if (checkIn >= checkOut) {
      setMessage("Abreise muss nach Anreise liegen");
      return;
    }

    let prompt = "Buchungsdetails speichern?";
    if (datesOrAptChanged && priceWillRecalc) {
      prompt =
        "Datum oder Wohnung geändert → Preis wird automatisch neu berechnet. Fortfahren?";
    } else if (datesOrAptChanged) {
      prompt = "Datum oder Wohnung geändert — fortfahren?";
    } else if (priceWillRecalc) {
      prompt =
        "Personen- oder Hundeanzahl geändert → Preis wird neu berechnet. Fortfahren?";
    }
    if (!confirm(prompt)) return;

    setLoading(true);
    setMessage(null);
    const result = await updateBookingDetails(bookingId, {
      apartment_id: apartmentId,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      dogs,
      notes,
    });
    setLoading(false);
    if (result.success) {
      setEditing(false);
      setMessage("Gespeichert");
      router.refresh();
      setTimeout(() => setMessage(null), 2500);
    } else {
      setMessage(result.error || "Fehler");
    }
  };

  const handleCancel = () => {
    setApartmentId(initialApartmentId);
    setCheckIn(initialCheckIn);
    setCheckOut(initialCheckOut);
    setAdults(initialAdults);
    setChildren(initialChildren);
    setDogs(initialDogs);
    setNotes(initialNotes);
    setEditing(false);
    setMessage(null);
  };

  if (!editing) {
    return (
      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
            />
          </svg>
          Buchungsdetails bearbeiten (Datum, Wohnung, Personen, Notizen)
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40";

  return (
    <div className="px-5 py-4 border-t border-stone-100 bg-amber-50/30 space-y-3">
      <p className="text-xs font-medium text-stone-600 uppercase tracking-wider">
        Buchungsdetails bearbeiten
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-stone-500 mb-1">Wohnung</label>
          <select
            value={apartmentId}
            onChange={(e) => setApartmentId(e.target.value)}
            className={inputClass}
          >
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (max. {a.maxGuests} Gäste)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Check-in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Check-out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Erwachsene</label>
          <input
            type="number"
            min={1}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Kinder (bis 12 J.)</label>
            <input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Hunde</label>
            <input
              type="number"
              min={0}
              value={dogs}
              onChange={(e) => setDogs(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-stone-500 mb-1">Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
      </div>

      {priceWillRecalc && (
        <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-2.5 py-1.5">
          ⚡ Preis wird automatisch neu berechnet.
        </p>
      )}
      {isExternalChannel && datesOrAptChanged && (
        <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
          ℹ️ Externe Buchung — der manuell eingetragene Preis bleibt unverändert.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Speichern..." : "Speichern"}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        {message && (
          <p
            className={`text-xs ${
              message === "Gespeichert" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
