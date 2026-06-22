"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpense, deleteExpense } from "@/app/(admin)/admin/actions";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  apartment_id?: string | null;
  note?: string | null;
}

const CATEGORIES = [
  { value: "cleaning", label: "Reinigung" },
  { value: "maintenance", label: "Wartung/Reparatur" },
  { value: "supplies", label: "Material/Ausstattung" },
  { value: "utilities", label: "Nebenkosten" },
  { value: "other", label: "Sonstiges" },
];

function catLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(n);
}

function formatDE(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-AT");
}

export default function ExpenseManager({
  expenses,
  apartments,
  defaultDate,
}: {
  expenses: Expense[];
  apartments: { id: string; name: string }[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [category, setCategory] = useState("cleaning");
  const [amount, setAmount] = useState("");
  const [apartmentId, setApartmentId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  const handleAdd = async () => {
    setError(null);
    const amt = parseFloat(amount.replace(",", "."));
    if (!date || !(amt > 0)) {
      setError("Bitte Datum und Betrag (> 0) angeben.");
      return;
    }
    setBusy(true);
    const res = await createExpense({
      expense_date: date,
      category,
      amount: amt,
      apartment_id: apartmentId || null,
      note: note || null,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Fehler beim Speichern");
      return;
    }
    setAmount("");
    setNote("");
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diese Ausgabe löschen?")) return;
    setBusy(true);
    await deleteExpense(id);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-stone-900 mb-4">Ausgaben</h2>

      {/* Erfassungs-Formular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input
          inputMode="decimal"
          placeholder="Betrag €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
        <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} className={inputClass}>
          <option value="">Wohnung (optional)</option>
          {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* Liste */}
      {expenses.length === 0 ? (
        <p className="text-sm text-stone-400 mt-4">Noch keine Ausgaben in diesem Zeitraum erfasst.</p>
      ) : (
        <div className="mt-4 divide-y divide-stone-100">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800">
                  {formatCurrency(e.amount)} · {catLabel(e.category)}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {formatDE(e.expense_date)}
                  {e.apartment_id ? ` · ${apartments.find((a) => a.id === e.apartment_id)?.name ?? e.apartment_id}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                disabled={busy}
                aria-label="Ausgabe löschen"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
