"use client";

import { useState, useTransition } from "react";
import { updateInvoiceNumber } from "@/app/(admin)/admin/actions";

interface InvoiceNumberEditProps {
  bookingId: string;
  initialNumber: string | null;
}

export default function InvoiceNumberEdit({
  bookingId,
  initialNumber,
}: InvoiceNumberEditProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNumber || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateInvoiceNumber(bookingId, value.trim());
      if (result.success) {
        setEditing(false);
      } else {
        setError(result.error || "Fehler beim Speichern");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-600">
          {initialNumber || "Keine Rechnungsnr."}
        </span>
        <button
          onClick={() => {
            setValue(initialNumber || "");
            setEditing(true);
          }}
          className="p-1 text-stone-400 hover:text-[#c8a96e] transition-colors"
          title="Rechnungsnummer bearbeiten"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-40 px-2 py-1 text-sm border border-stone-300 rounded-md focus:border-[#c8a96e] focus:ring-1 focus:ring-[#c8a96e]/30 outline-none"
        placeholder="z.B. FR-2026-0001"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="px-2 py-1 text-xs bg-[#c8a96e] text-white rounded-md hover:bg-[#b89555] disabled:opacity-50 transition-colors"
      >
        {isPending ? "..." : "OK"}
      </button>
      <button
        onClick={() => setEditing(false)}
        disabled={isPending}
        className="px-2 py-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
      >
        Abbrechen
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
