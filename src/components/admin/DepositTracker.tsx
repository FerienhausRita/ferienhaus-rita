"use client";

import { useState } from "react";
import { markDepositPaid, markRemainderPaid } from "@/app/(admin)/admin/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface DepositTrackerProps {
  bookingId: string;
  totalPrice: number;
  depositAmount: number;
  depositDueDate: string | null;
  depositPaidAt: string | null;
  remainderAmount: number;
  remainderDueDate: string | null;
  remainderPaidAt: string | null;
  paymentStatus: string;
}

export default function DepositTracker({
  bookingId,
  totalPrice,
  depositAmount,
  depositDueDate,
  depositPaidAt,
  remainderAmount,
  remainderDueDate,
  remainderPaidAt,
  paymentStatus,
}: DepositTrackerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const depositOverdue = depositDueDate && depositDueDate < today && !depositPaidAt;
  const remainderOverdue = remainderDueDate && remainderDueDate < today && !remainderPaidAt;

  const hasDeposit = depositAmount > 0;
  const hasRemainder = remainderAmount > 0;
  const isFullyPaid = paymentStatus === "paid";

  // If no deposit info set yet (old bookings)
  if (!hasDeposit && !isFullyPaid) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">Zahlungen</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-stone-500">
            Noch keine Zahlungsbetr&auml;ge berechnet. Buchung best&auml;tigen um Anzahlung/Rest zu berechnen.
          </p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-stone-600">Gesamtbetrag</span>
            <span className="font-semibold text-stone-900">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    );
  }

  const handleMarkDeposit = async () => {
    if (!confirm(`Anzahlung von ${formatCurrency(depositAmount)} als bezahlt markieren?`)) return;
    setLoading("deposit");
    setMessage(null);
    const result = await markDepositPaid(bookingId);
    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Anzahlung als bezahlt markiert" });
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handleMarkRemainder = async () => {
    if (!confirm(`Restbetrag von ${formatCurrency(remainderAmount)} als bezahlt markieren?`)) return;
    setLoading("remainder");
    setMessage(null);
    const result = await markRemainderPaid(bookingId);
    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Restbetrag als bezahlt markiert" });
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  // Progress calculation
  const paidAmount = (depositPaidAt ? depositAmount : 0) + (remainderPaidAt ? remainderAmount : 0);
  const progressPercent = totalPrice > 0 ? Math.round((paidAmount / totalPrice) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900 text-sm">Zahlungen</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isFullyPaid
              ? "bg-emerald-100 text-emerald-700"
              : depositPaidAt
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}>
            {isFullyPaid ? "Bezahlt" : depositPaidAt ? "Teilweise" : "Offen"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1.5">
            <span>{formatCurrency(paidAmount)} bezahlt</span>
            <span>{formatCurrency(totalPrice)} gesamt</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFullyPaid ? "bg-emerald-500" : depositPaidAt ? "bg-amber-500" : "bg-stone-300"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Deposit */}
        {hasDeposit && (
          <div className={`rounded-xl border p-3 ${
            depositPaidAt
              ? "border-emerald-200 bg-emerald-50/50"
              : depositOverdue
              ? "border-red-200 bg-red-50/50"
              : "border-stone-200"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {hasRemainder ? "Anzahlung (30%)" : "Gesamtbetrag"}
              </span>
              {depositPaidAt && (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {depositOverdue && (
                <span className="text-xs font-medium text-red-600">
                  &Uuml;berf&auml;llig
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(depositAmount)}</p>
            {depositDueDate && (
              <p className="text-xs text-stone-500 mt-0.5">
                {depositPaidAt
                  ? `Bezahlt am ${formatDate(depositPaidAt.split("T")[0])}`
                  : `F\u00e4llig bis ${formatDate(depositDueDate)}`
                }
              </p>
            )}
            {!depositPaidAt && (
              <button
                onClick={handleMarkDeposit}
                disabled={loading !== null}
                className="mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {loading === "deposit" ? "..." : "Als bezahlt markieren"}
              </button>
            )}
          </div>
        )}

        {/* Remainder */}
        {hasRemainder && (
          <div className={`rounded-xl border p-3 ${
            remainderPaidAt
              ? "border-emerald-200 bg-emerald-50/50"
              : remainderOverdue
              ? "border-red-200 bg-red-50/50"
              : "border-stone-200"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Restbetrag (70%)
              </span>
              {remainderPaidAt && (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {remainderOverdue && (
                <span className="text-xs font-medium text-red-600">
                  &Uuml;berf&auml;llig
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(remainderAmount)}</p>
            {remainderDueDate && (
              <p className="text-xs text-stone-500 mt-0.5">
                {remainderPaidAt
                  ? `Bezahlt am ${formatDate(remainderPaidAt.split("T")[0])}`
                  : `F\u00e4llig bis ${formatDate(remainderDueDate)}`
                }
              </p>
            )}
            {!remainderPaidAt && depositPaidAt && (
              <button
                onClick={handleMarkRemainder}
                disabled={loading !== null}
                className="mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {loading === "remainder" ? "..." : "Als bezahlt markieren"}
              </button>
            )}
            {!remainderPaidAt && !depositPaidAt && (
              <p className="mt-1 text-xs text-stone-400 italic">Erst Anzahlung markieren</p>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`rounded-lg p-2 text-xs font-medium ${
            message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
