"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBlockedDate } from "@/app/(admin)/admin/actions";

interface BlockDateFormProps {
  apartments: { id: string; name: string }[];
}

export default function BlockDateForm({ apartments }: BlockDateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apartmentId, setApartmentId] = useState(apartments[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentId || !startDate || !endDate) return;
    if (endDate <= startDate) {
      setError("Enddatum muss nach Startdatum liegen");
      return;
    }

    setLoading(true);
    setError("");

    const result = await createBlockedDate(
      apartmentId,
      startDate,
      endDate,
      reason
    );

    setLoading(false);

    if (result.success) {
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      router.refresh();
    } else {
      setError(result.error || "Fehler beim Speichern");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white rounded-xl text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Datum sperren
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6"
        >
          <h3 className="font-semibold text-stone-900 text-lg mb-4">
            Zeitraum sperren
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Wohnung
              </label>
              <select
                value={apartmentId}
                onChange={(e) => setApartmentId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Von
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Bis
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Grund (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Renovierung, Eigennutzung..."
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 px-4 border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b89555] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Wird gesperrt..." : "Sperren"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
