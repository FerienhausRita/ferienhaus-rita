"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPlatformPayout,
  revertPlatformPayout,
  updatePlatformPayoutAmount,
} from "@/app/(admin)/admin/actions";
import { todayISO } from "@/lib/dates";

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

export default function PlatformPayoutStatus({
  bookingId,
  paymentStatus,
  channel,
  expectedPayoutDate,
  totalPrice,
  payoutAmount,
}: {
  bookingId: string;
  paymentStatus: string;
  channel: string;
  expectedPayoutDate: string | null;
  totalPrice: number;
  payoutAmount: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amount, setAmount] = useState(totalPrice.toFixed(2));

  const today = todayISO();
  const overdue = !!(expectedPayoutDate && expectedPayoutDate <= today);
  const isPending = paymentStatus === "platform_pending";
  const isPaid = paymentStatus === "paid";
  const fee =
    payoutAmount !== null ? Math.round((totalPrice - payoutAmount) * 100) / 100 : null;

  const handleConfirm = async () => {
    const net = parseFloat(amount);
    if (!Number.isFinite(net) || net < 0) {
      alert("Bitte einen gültigen Auszahlungsbetrag eingeben.");
      return;
    }
    setBusy(true);
    const r = await confirmPlatformPayout(bookingId, net);
    setBusy(false);
    if (r.success) {
      setConfirming(false);
      router.refresh();
    } else alert(`Fehler: ${r.error}`);
  };

  const handleRevert = async () => {
    if (!confirm("Auszahlung wieder als ausstehend markieren?")) return;
    setBusy(true);
    const r = await revertPlatformPayout(bookingId);
    setBusy(false);
    if (r.success) router.refresh();
    else alert(`Fehler: ${r.error}`);
  };

  const handleSaveAmount = async () => {
    const net = parseFloat(amount);
    if (!Number.isFinite(net) || net < 0) {
      alert("Bitte einen gültigen Betrag eingeben.");
      return;
    }
    setBusy(true);
    const r = await updatePlatformPayoutAmount(bookingId, net);
    setBusy(false);
    if (r.success) {
      setEditingAmount(false);
      router.refresh();
    } else alert(`Fehler: ${r.error}`);
  };

  return (
    <div className="mt-3 pt-3 border-t border-blue-200">
      {isPending ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-blue-900">
            Auszahlung ausstehend{" "}
            <span className={overdue ? "text-red-600 font-semibold" : "text-blue-800"}>
              · erwartet {formatDate(expectedPayoutDate)}
              {overdue ? " (fällig — Bankeingang prüfen)" : ""}
            </span>
          </p>
          {confirming ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-stone-600">Erhaltener Netto-Betrag:</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-28 text-right rounded-lg border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
              >
                {busy ? "..." : "Bestätigen"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs px-2 py-1.5 text-stone-500 hover:text-stone-700"
              >
                Abbrechen
              </button>
              <span className="text-[11px] text-stone-400 w-full">
                Buchungswert {formatCurrency(totalPrice)} — trage ein, was die Plattform
                tatsächlich auszahlt (nach Abzug ihrer Gebühr).
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                setAmount(totalPrice.toFixed(2));
                setConfirming(true);
              }}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
            >
              Auszahlung erhalten
            </button>
          )}
        </div>
      ) : isPaid ? (
        <div className="space-y-1.5">
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
          {editingAmount ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600">Auszahlung:</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-28 text-right rounded-lg border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                onClick={handleSaveAmount}
                disabled={busy}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
              >
                OK
              </button>
              <button onClick={() => setEditingAmount(false)} className="text-xs text-stone-500">
                ✕
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-600">
              {payoutAmount !== null ? (
                <>
                  Auszahlung <span className="font-medium">{formatCurrency(payoutAmount)}</span>
                  {fee !== null && fee !== 0 && (
                    <> · Gebühr {formatCurrency(fee)} (Buchungswert {formatCurrency(totalPrice)})</>
                  )}{" "}
                  <button
                    onClick={() => {
                      setAmount(payoutAmount.toFixed(2));
                      setEditingAmount(true);
                    }}
                    className="text-[#c8a96e] hover:text-[#b89555] underline ml-1"
                  >
                    ändern
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAmount(totalPrice.toFixed(2));
                    setEditingAmount(true);
                  }}
                  className="text-[#c8a96e] hover:text-[#b89555] underline"
                >
                  Auszahlungsbetrag eintragen
                </button>
              )}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
