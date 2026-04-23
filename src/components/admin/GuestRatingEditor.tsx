"use client";

import { useState } from "react";
import { updateGuestRating } from "@/app/(admin)/admin/actions";

interface GuestRatingEditorProps {
  guestId: string;
  initialRating: number | null;
  initialNotes: string;
}

export default function GuestRatingEditor({
  guestId,
  initialRating,
  initialNotes,
}: GuestRatingEditorProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    const result = await updateGuestRating(guestId, {
      rating,
      notes,
    });
    setLoading(false);
    setMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setMessage(null), 3000);
  };

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">Meine Bewertung</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Nur für dich sichtbar — hilft, den Gast beim nächsten Besuch besser einschätzen zu können.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-2 uppercase tracking-wider">
            Sterne
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(null)}
                className="text-3xl transition-colors"
                aria-label={`${n} Stern${n > 1 ? "e" : ""}`}
              >
                <span
                  className={
                    n <= displayRating ? "text-amber-400" : "text-stone-200"
                  }
                >
                  ★
                </span>
              </button>
            ))}
            {rating !== null && (
              <button
                type="button"
                onClick={() => setRating(null)}
                className="ml-3 text-xs text-stone-400 hover:text-stone-600"
              >
                zurücksetzen
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wider">
            Notizen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. pünktlich angereist, sehr freundlich, Wohnung makellos hinterlassen"
            rows={4}
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
          {message && (
            <p
              className={`text-xs ${
                message === "Gespeichert"
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
