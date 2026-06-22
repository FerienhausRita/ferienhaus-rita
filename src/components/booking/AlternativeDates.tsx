"use client";

import { useEffect, useState } from "react";

interface Suggestion {
  apartmentId: string;
  apartmentName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  offsetDays: number;
}

function formatDE(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-AT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AlternativeDates({
  checkIn,
  checkOut,
  guests,
  onSelect,
}: {
  checkIn: string;
  checkOut: string;
  guests: number;
  onSelect: (apartmentId: string, checkIn: string, checkOut: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/availability/suggestions?checkIn=${encodeURIComponent(
        checkIn
      )}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSuggestions(d.suggestions ?? []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, guests]);

  if (loading) {
    return (
      <p className="mt-6 text-sm text-stone-400">
        Suche nach freien Alternativterminen…
      </p>
    );
  }
  if (!suggestions || suggestions.length === 0) return null;

  const nights = suggestions[0].nights;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-stone-900 mb-1">
        Nächste freie Termine
      </h3>
      <p className="text-sm text-stone-500 mb-4">
        Ihr Wunschzeitraum ist belegt. Gleiche Dauer ({nights}{" "}
        {nights === 1 ? "Nacht" : "Nächte"}), passend zu Ihrer Auswahl:
      </p>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={`${s.apartmentId}-${i}`}
            className="flex items-center justify-between gap-4 p-3 rounded-xl border border-stone-100 hover:border-alpine-300 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-medium text-stone-800">
                {formatDE(s.checkIn)} – {formatDE(s.checkOut)}
              </p>
              <p className="text-sm text-stone-500 truncate">{s.apartmentName}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(s.apartmentId, s.checkIn, s.checkOut)}
              className="flex-shrink-0 bg-alpine-600 hover:bg-alpine-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Übernehmen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
