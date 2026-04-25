"use client";

import { useState } from "react";
import { markDepositPaid, markRemainderPaid, recordManualPayment, updateBookingDeposit } from "@/app/(admin)/admin/actions";
import { useRouter } from "next/navigation";

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

const paymentMethods: Record<string, string> = {
  bank_transfer: "Überweisung",
  cash: "Bar",
  card: "Karte",
  paypal: "PayPal",
  other: "Sonstige",
};

interface BookingPayment {
  id: string;
  amount: number;
  paid_at: string;
  method: string;
  applies_to: "deposit" | "remainder";
  note: string | null;
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
  payments?: BookingPayment[];
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
  payments = [],
}: DepositTrackerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualMethod, setManualMethod] = useState("bank_transfer");
  const [manualNote, setManualNote] = useState("");
  const [manualAppliesTo, setManualAppliesTo] = useState<"auto" | "deposit" | "remainder">("auto");
  // Deposit/Frist manuell überschreiben
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [editDepAmount, setEditDepAmount] = useState(depositAmount.toFixed(2));
  const [editDepDue, setEditDepDue] = useState(depositDueDate ?? "");
  const [editRemAmount, setEditRemAmount] = useState(remainderAmount.toFixed(2));
  const [editRemDue, setEditRemDue] = useState(remainderDueDate ?? "");

  // Dynamic percentage labels derived from actual amounts
  const depositPercent =
    totalPrice > 0 ? Math.round((depositAmount / totalPrice) * 100) : 0;
  const remainderPercent =
    totalPrice > 0 ? Math.round((remainderAmount / totalPrice) * 100) : 0;

  // Running totals from ledger
  const depositPaidSum = payments
    .filter((p) => p.applies_to === "deposit")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const remainderPaidSum = payments
    .filter((p) => p.applies_to === "remainder")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const depositOpen = Math.max(0, depositAmount - depositPaidSum);
  const remainderOpen = Math.max(0, remainderAmount - remainderPaidSum);

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
            Noch keine Zahlungsbeträge berechnet. Buchung bestätigen um Anzahlung/Rest zu berechnen.
          </p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-stone-600">Gesamtbetrag</span>
            <span className="font-semibold text-stone-900">{formatCurrency(totalPrice)}</span>
          </div>

          {/* Manual payment even without deposit setup */}
          <button
            onClick={() => {
              setManualAmount(totalPrice.toFixed(2));
              setShowManualForm(true);
            }}
            className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            Zahlung manuell verbuchen
          </button>

          {showManualForm && (
            <ManualPaymentForm
              bookingId={bookingId}
              amount={manualAmount}
              setAmount={setManualAmount}
              date={manualDate}
              setDate={setManualDate}
              method={manualMethod}
              setMethod={setManualMethod}
              note={manualNote}
              setNote={setManualNote}
              appliesTo={manualAppliesTo}
              setAppliesTo={setManualAppliesTo}
              loading={loading}
              setLoading={setLoading}
              setMessage={setMessage}
              onClose={() => setShowManualForm(false)}
              depositOpen={depositOpen}
              remainderOpen={remainderOpen}
            />
          )}

          {message && (
            <div className={`mt-2 rounded-lg p-2 text-xs font-medium ${
              message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              {message.text}
            </div>
          )}
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

  const router = useRouter();

  const handleSaveDepositOverride = async () => {
    const depAmount = parseFloat(editDepAmount);
    const remAmount = parseFloat(editRemAmount);
    if (isNaN(depAmount) || isNaN(remAmount)) {
      setMessage({ type: "error", text: "Beträge müssen Zahlen sein" });
      return;
    }
    const sum = depAmount + remAmount;
    if (Math.abs(sum - totalPrice) > 0.02) {
      if (
        !confirm(
          `Anzahlung + Restbetrag (${formatCurrency(sum)}) entspricht nicht dem Gesamtbetrag (${formatCurrency(totalPrice)}). Trotzdem speichern?`
        )
      ) {
        return;
      }
    }
    setLoading("override");
    setMessage(null);
    const result = await updateBookingDeposit(bookingId, {
      deposit_amount: depAmount,
      deposit_due_date: editDepDue || null,
      remainder_amount: remAmount,
      remainder_due_date: editRemDue || null,
    });
    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: "Anzahlung aktualisiert" });
      setEditingDeposit(false);
      router.refresh();
      setTimeout(() => setMessage(null), 2500);
    } else {
      setMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handleCancelDepositOverride = () => {
    setEditDepAmount(depositAmount.toFixed(2));
    setEditDepDue(depositDueDate ?? "");
    setEditRemAmount(remainderAmount.toFixed(2));
    setEditRemDue(remainderDueDate ?? "");
    setEditingDeposit(false);
    setMessage(null);
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

  // Suggest remaining amount for manual payment
  const suggestedAmount = !depositPaidAt
    ? depositAmount
    : !remainderPaidAt
    ? remainderAmount
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900 text-sm">Zahlungen</h3>
          <div className="flex items-center gap-2">
            {!editingDeposit && !isFullyPaid && (
              <button
                onClick={() => setEditingDeposit(true)}
                className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
                title="Anzahlung & Frist manuell überschreiben"
              >
                Bearbeiten
              </button>
            )}
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
      </div>

      <div className="p-5 space-y-4">
        {/* Inline-Edit für Anzahlung & Frist (manuelle Übersteuerung) */}
        {editingDeposit && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <p className="text-xs font-medium text-stone-600 uppercase tracking-wider">
              Anzahlung & Restbetrag manuell setzen
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Anzahlung (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editDepAmount}
                  onChange={(e) => setEditDepAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Anzahlung fällig bis</label>
                <input
                  type="date"
                  value={editDepDue}
                  onChange={(e) => setEditDepDue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Restbetrag (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editRemAmount}
                  onChange={(e) => setEditRemAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Restbetrag fällig bis</label>
                <input
                  type="date"
                  value={editRemDue}
                  onChange={(e) => setEditRemDue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              Summe muss dem Gesamtpreis ({formatCurrency(totalPrice)}) entsprechen.
              Frist leer lassen = nicht gesetzt.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDepositOverride}
                disabled={loading !== null}
                className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading === "override" ? "Speichern..." : "Speichern"}
              </button>
              <button
                onClick={handleCancelDepositOverride}
                disabled={loading !== null}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

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
                {hasRemainder ? `Anzahlung (${depositPercent}%)` : "Gesamtbetrag"}
              </span>
              {depositPaidAt && (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {depositOverdue && (
                <span className="text-xs font-medium text-red-600">Überfällig</span>
              )}
            </div>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(depositAmount)}</p>
            {depositPaidSum > 0 && depositPaidSum < depositAmount && (
              <p className="text-xs text-stone-600 mt-0.5">
                {formatCurrency(depositPaidSum)} gezahlt · <span className="text-red-600">{formatCurrency(depositOpen)} offen</span>
              </p>
            )}
            {depositDueDate && (
              <p className="text-xs text-stone-500 mt-0.5">
                {depositPaidAt
                  ? `Bezahlt am ${formatDate(depositPaidAt.split("T")[0])}`
                  : `Fällig bis ${formatDate(depositDueDate)}`
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
                Restbetrag ({remainderPercent}%)
              </span>
              {remainderPaidAt && (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {remainderOverdue && (
                <span className="text-xs font-medium text-red-600">Überfällig</span>
              )}
            </div>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(remainderAmount)}</p>
            {remainderPaidSum > 0 && remainderPaidSum < remainderAmount && (
              <p className="text-xs text-stone-600 mt-0.5">
                {formatCurrency(remainderPaidSum)} gezahlt · <span className="text-red-600">{formatCurrency(remainderOpen)} offen</span>
              </p>
            )}
            {remainderDueDate && (
              <p className="text-xs text-stone-500 mt-0.5">
                {remainderPaidAt
                  ? `Bezahlt am ${formatDate(remainderPaidAt.split("T")[0])}`
                  : `Fällig bis ${formatDate(remainderDueDate)}`
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

        {/* Manual payment button */}
        {!isFullyPaid && (
          <>
            <button
              onClick={() => {
                setManualAmount(suggestedAmount.toFixed(2));
                setShowManualForm(!showManualForm);
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Zahlung manuell verbuchen
            </button>

            {showManualForm && (
              <ManualPaymentForm
                bookingId={bookingId}
                amount={manualAmount}
                setAmount={setManualAmount}
                date={manualDate}
                setDate={setManualDate}
                method={manualMethod}
                setMethod={setManualMethod}
                note={manualNote}
                setNote={setManualNote}
                appliesTo={manualAppliesTo}
                setAppliesTo={setManualAppliesTo}
                loading={loading}
                setLoading={setLoading}
                setMessage={setMessage}
                onClose={() => setShowManualForm(false)}
                depositOpen={depositOpen}
                remainderOpen={remainderOpen}
              />
            )}
          </>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="pt-3 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
              Verbuchte Zahlungen
            </p>
            <ul className="space-y-2">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="bg-white border border-stone-200 rounded-lg p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.applies_to === "deposit"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p.applies_to === "deposit" ? "Anzahlung" : "Restbetrag"}
                    </span>
                    <span className="font-semibold text-stone-900 text-sm">
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
                    <span>{formatDate(p.paid_at)}</span>
                    <span>·</span>
                    <span>{paymentMethods[p.method] ?? p.method}</span>
                  </div>
                  {p.note && (
                    <p
                      className="text-[11px] text-stone-400 mt-1 break-words"
                      title={p.note}
                    >
                      {p.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
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

// Separate manual payment form component
function ManualPaymentForm({
  bookingId,
  amount,
  setAmount,
  date,
  setDate,
  method,
  setMethod,
  note,
  setNote,
  appliesTo,
  setAppliesTo,
  loading,
  setLoading,
  setMessage,
  onClose,
  depositOpen,
  remainderOpen,
}: {
  bookingId: string;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  method: string;
  setMethod: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  appliesTo: "auto" | "deposit" | "remainder";
  setAppliesTo: (v: "auto" | "deposit" | "remainder") => void;
  loading: string | null;
  setLoading: (v: string | null) => void;
  setMessage: (v: { type: "success" | "error"; text: string } | null) => void;
  onClose: () => void;
  depositOpen: number;
  remainderOpen: number;
}) {
  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: "error", text: "Bitte gültigen Betrag eingeben" });
      return;
    }
    if (!date) {
      setMessage({ type: "error", text: "Bitte Datum wählen" });
      return;
    }

    setLoading("manual");
    setMessage(null);

    const result = await recordManualPayment(bookingId, {
      amount: parsedAmount,
      paid_at: date,
      method,
      note: note.trim() || undefined,
      applies_to: appliesTo,
    });

    setLoading(null);
    if (result.success) {
      setMessage({ type: "success", text: `Zahlung über ${formatCurrency(parsedAmount)} verbucht` });
      setNote("");
      onClose();
    } else {
      setMessage({ type: "error", text: result.error || "Fehler beim Verbuchen" });
    }
  };

  const labelClass =
    "block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1";
  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  const openHint: string[] = [];
  if (depositOpen > 0)
    openHint.push(`Anzahlung ${formatCurrency(depositOpen)}`);
  if (remainderOpen > 0)
    openHint.push(`Restbetrag ${formatCurrency(remainderOpen)}`);

  return (
    <div className="mt-3 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
      {/* Amount — prominent */}
      <div>
        <label className={labelClass}>Betrag</label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-stone-200 text-base font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium text-sm pointer-events-none">
            €
          </span>
        </div>
      </div>

      <div>
        <label className={labelClass}>Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Zahlungsart</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={inputClass}
        >
          {Object.entries(paymentMethods).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Verbuchen auf</label>
        <select
          value={appliesTo}
          onChange={(e) =>
            setAppliesTo(e.target.value as "auto" | "deposit" | "remainder")
          }
          className={inputClass}
        >
          <option value="auto">Automatisch</option>
          <option value="deposit">Anzahlung</option>
          <option value="remainder">Restbetrag</option>
        </select>
        {openHint.length > 0 && (
          <p className="text-[11px] text-stone-400 mt-1">
            Noch offen: {openHint.join(" · ")}
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Notiz (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z.B. Referenznr."
          className={inputClass}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={loading !== null}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-[#c8a96e] hover:bg-[#b89555] text-white transition-colors disabled:opacity-50"
        >
          {loading === "manual" ? "Verbuche..." : "Zahlung verbuchen"}
        </button>
        <button
          onClick={onClose}
          disabled={loading !== null}
          className="py-2 px-3 rounded-lg text-sm font-medium bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
