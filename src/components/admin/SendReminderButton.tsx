"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendBookingPaymentReminder } from "@/app/(admin)/admin/actions";

export default function SendReminderButton({
  bookingId,
  bucket,
  label = "Erinnerung senden",
  className,
}: {
  bookingId: string;
  bucket: "deposit" | "remainder";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    const kind = bucket === "deposit" ? "Anzahlung" : "Restbetrag";
    if (!confirm(`Zahlungserinnerung (${kind}) jetzt an den Gast senden? Der Betrag wird aus dem aktuellen offenen Stand berechnet.`)) {
      return;
    }
    setBusy(true);
    const r = await sendBookingPaymentReminder(bookingId, bucket);
    setBusy(false);
    if (r.success) {
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 4000);
    } else {
      alert(`Fehler: ${r.error}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy || done}
      className={
        className ??
        "text-xs px-3 py-1.5 rounded-lg bg-[#c8a96e] hover:bg-[#b89555] text-white font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
      }
    >
      {busy ? "Sende…" : done ? "✓ Gesendet" : label}
    </button>
  );
}
