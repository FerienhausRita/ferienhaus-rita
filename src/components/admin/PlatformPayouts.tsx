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

  if (bookings.length === 0) return null;

  const handleConfirm = async (b: PlatformPayoutBooking) => {
    if (
      !confirm(
        `Auszahlung für ${b.first_name} ${b.last_name} (${b.source_channel}) als erhalten markieren? Die Buchung gilt dann als bezahlt.`
      )
    )
      return;
    setBusy(b.id);
    const r = await confirmPlatformPayout(b.id);
    setBusy(null);
    if (r.success) router.refresh();
    else alert(`Fehler: ${r.error}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-900">Plattform-Auszahlungen</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Externe Buchungen — Geldeingang prüfen und bestätigen
          </p>
        </div>
        <span className="text-xs text-stone-500">{bookings.length} offen</span>
      </div>
      <div className="divide-y divide-stone-100">
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
              <span className="font-semibold text-stone-900 text-sm">
                {formatCurrency(Number(b.total_price))}
              </span>
              <button
                onClick={() => handleConfirm(b)}
                disabled={busy === b.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium transition disabled:opacity-50"
              >
                {busy === b.id ? "..." : "Auszahlung erhalten"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
