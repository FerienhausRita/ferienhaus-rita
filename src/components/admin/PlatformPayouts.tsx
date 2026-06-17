"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmPlatformPayout } from "@/app/(admin)/admin/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(amount);
}
function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export interface PlatformPayoutBooking {
  id: string;
  first_name: string;
  last_name: string;
  apartment_name: string;
  check_in: string;
  check_out: string;
  total_price: number;
  source_channel: string | null;
  expected_payout_date: string | null;
  overdue: boolean;
}

export default function PlatformPayouts({
  bookings,
}: {
  bookings: PlatformPayoutBooking[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const overdueCount = bookings.filter((b) => b.overdue).length;
  // Standardmäßig eingeklappt — aber offen, wenn etwas überfällig ist.
  const [open, setOpen] = useState(overdueCount > 0);

  if (bookings.length === 0) return null;

  const openConfirm = (b: PlatformPayoutBooking) => {
    setConfirmId(b.id);
    setAmount(Number(b.total_price).toFixed(2)); // vorausgefüllt mit Buchungswert
  };

  const handleConfirm = async (b: PlatformPayoutBooking) => {
    const net = parseFloat(amount);
    if (!Number.isFinite(net) || net < 0) {
      alert("Bitte einen gültigen Auszahlungsbetrag eingeben.");
      return;
    }
    setBusy(b.id);
    const r = await confirmPlatformPayout(b.id, net);
    setBusy(null);
    if (r.success) {
      setConfirmId(null);
      router.refresh();
    } else {
      alert(`Fehler: ${r.error}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 border-b border-stone-100 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-stone-900">Plattform-Auszahlungen</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Externe Buchungen — Geldeingang prüfen und bestätigen
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-stone-500">{bookings.length} offen</span>
          {overdueCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {overdueCount} fällig
            </span>
          )}
          <svg
            className={`w-5 h-5 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
      <div className={`divide-y divide-stone-100 ${open ? "" : "hidden"}`}>
        {bookings.map((b) => (
          <div
            key={b.id}
            className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
              b.overdue ? "bg-red-50/40" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/buchungen/${b.id}`}
                  className="text-sm font-medium text-stone-900 hover:text-[#c8a96e]"
                >
                  {b.first_name} {b.last_name}
                </Link>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {b.source_channel}
                </span>
                {b.overdue && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    Auszahlung fällig — Bankeingang prüfen
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {b.apartment_name} · {formatDate(b.check_in)} – {formatDate(b.check_out)} ·
                erwartet {formatDate(b.expected_payout_date)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-semibold text-stone-900 text-sm" title="Buchungswert (brutto)">
                {formatCurrency(Number(b.total_price))}
              </span>
              {confirmId === b.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500">Erhalten:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                    className="w-24 text-right rounded-lg border border-stone-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <button
                    onClick={() => handleConfirm(b)}
                    disabled={busy === b.id}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
                  >
                    {busy === b.id ? "..." : "OK"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs px-2 py-1.5 text-stone-500 hover:text-stone-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openConfirm(b)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium transition"
                >
                  Auszahlung erhalten
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
