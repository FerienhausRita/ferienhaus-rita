"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPlatformPayout, revertPlatformPayout } from "@/app/(admin)/admin/actions";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PlatformPayoutStatus({
  bookingId,
  paymentStatus,
  channel,
  expectedPayoutDate,
}: {
  bookingId: string;
  paymentStatus: string;
  channel: string;
  expectedPayoutDate: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const overdue = !!(expectedPayoutDate && expectedPayoutDate <= today);
  const isPending = paymentStatus === "platform_pending";
  const isPaid = paymentStatus === "paid";

  const handleConfirm = async () => {
    if (!confirm(`Auszahlung von ${channel} als erhalten markieren? Die Buchung gilt dann als bezahlt.`)) return;
    setBusy(true);
    const r = await confirmPlatformPayout(bookingId);
    setBusy(false);
    if (r.success) router.refresh();
    else alert(`Fehler: ${r.error}`);
  };

  const handleRevert = async () => {
    if (!confirm("Auszahlung wieder als ausstehend markieren?")) return;
    setBusy(true);
    const r = await revertPlatformPayout(bookingId);
    setBusy(false);
    if (r.success) router.refresh();
    else alert(`Fehler: ${r.error}`);
  };

  return (
    <div className="mt-3 pt-3 border-t border-blue-200">
      {isPending ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-blue-900">
              Auszahlung ausstehend{" "}
              <span className={overdue ? "text-red-600 font-semibold" : "text-blue-800"}>
                · erwartet {formatDate(expectedPayoutDate)}
                {overdue ? " (fällig — Bankeingang prüfen)" : ""}
              </span>
            </p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? "..." : "Auszahlung erhalten"}
          </button>
        </div>
      ) : isPaid ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-emerald-700">✓ Auszahlung erhalten</p>
          <button
            onClick={handleRevert}
            disabled={busy}
            className="text-xs text-stone-500 hover:text-stone-700 underline disabled:opacity-50"
          >
            {busy ? "..." : "rückgängig"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
