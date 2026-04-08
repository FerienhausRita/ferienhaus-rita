"use client";

import { useState } from "react";
import { addBookingNote } from "@/app/(admin)/admin/actions";

interface Note {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface BookingNotesProps {
  bookingId: string;
  initialNotes: Note[];
}

export default function BookingNotes({ bookingId, initialNotes }: BookingNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const result = await addBookingNote(bookingId, content);
    setLoading(false);

    if (result.success) {
      // Optimistic: add to list
      setNotes((prev) => [
        {
          id: crypto.randomUUID(),
          author_name: "Ich",
          content: content.trim(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setContent("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">
          Interne Notizen ({notes.length})
        </h2>
      </div>

      {/* Add note */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-stone-100">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notiz hinzufügen..."
          rows={2}
          className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </form>

      {/* Notes list */}
      <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="p-4 text-sm text-stone-400">Noch keine Notizen</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-stone-700">
                  {note.author_name}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(note.created_at).toLocaleDateString("de-AT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
