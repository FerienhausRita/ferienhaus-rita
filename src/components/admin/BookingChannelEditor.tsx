"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingChannel } from "@/app/(admin)/admin/actions";

const CHANNELS = [
  { value: "Website", label: "Direktbuchung (Website)" },
  { value: "Booking.com", label: "Booking.com" },
  { value: "Airbnb", label: "Airbnb" },
  { value: "Holidu", label: "Holidu" },
  { value: "Andere", label: "Andere Plattform" },
];

export default function BookingChannelEditor({
  bookingId,
  currentChannel,
}: {
  bookingId: string;
  currentChannel: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [channel, setChannel] = useState(currentChannel || "Website");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const displayCurrent = currentChannel || "Direktbuchung (Website)";

  const handleSave = async () => {
    const isExternal = channel !== "Website";
    const confirmMsg = isExternal
      ? `Buchungsquelle auf „${channel}" setzen? Die Buchung wird als Plattform-Auszahlung behandelt (Status „Auszahlung ausstehend", kein Anzahlungsplan).`
      : `Buchungsquelle auf „Direktbuchung" setzen? Ein evtl. „Auszahlung ausstehend"-Status wird auf „offen" zurückgesetzt.`;
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setMessage(null);
    const r = await updateBookingChannel(bookingId, channel);
    setBusy(false);
    if (r.success) {
      setEditing(false);
      setMessage("Gespeichert");
      router.refresh();
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage(`Fehler: ${r.error}`);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-stone-500">Quelle:</span>
        <span className="font-medium text-stone-700">{displayCurrent}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-[#c8a96e] hover:text-[#b89555] font-medium"
        >
          ändern
        </button>
        {message && <span className="text-emerald-600">{message}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-stone-500">Quelle:</span>
      <select
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        className="px-2 py-1 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
      >
        {CHANNELS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={busy}
        className="px-2.5 py-1 rounded-lg bg-[#c8a96e] hover:bg-[#b89555] text-white font-medium disabled:opacity-50"
      >
        {busy ? "..." : "Speichern"}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setChannel(currentChannel || "Website");
        }}
        className="px-2 py-1 text-stone-500 hover:text-stone-700"
      >
        Abbrechen
      </button>
      {message && <span className="text-red-600">{message}</span>}
    </div>
  );
}
