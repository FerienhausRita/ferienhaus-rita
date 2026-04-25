"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateWaitlistStatus,
  deleteWaitlistEntry,
} from "@/app/(admin)/admin/actions";

export default function WaitlistEntryActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const setStatus = (
    next: "active" | "notified" | "booked" | "expired" | "cancelled"
  ) => {
    startTransition(async () => {
      await updateWaitlistStatus(id, next);
      router.refresh();
      setOpen(false);
    });
  };

  const handleDelete = () => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    startTransition(async () => {
      await deleteWaitlistEntry(id);
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded transition-colors disabled:opacity-50"
      >
        Aktion ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-stone-200 z-10 py-1">
          {currentStatus !== "notified" && (
            <button
              onClick={() => setStatus("notified")}
              className="block w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Als benachrichtigt markieren
            </button>
          )}
          {currentStatus !== "booked" && (
            <button
              onClick={() => setStatus("booked")}
              className="block w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Als gebucht markieren
            </button>
          )}
          {currentStatus !== "active" && (
            <button
              onClick={() => setStatus("active")}
              className="block w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Wieder aktivieren
            </button>
          )}
          {currentStatus !== "cancelled" && (
            <button
              onClick={() => setStatus("cancelled")}
              className="block w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Stornieren
            </button>
          )}
          <div className="border-t border-stone-100 my-1" />
          <button
            onClick={handleDelete}
            className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  );
}
