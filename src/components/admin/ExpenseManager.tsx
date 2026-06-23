"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createExpense,
  deleteExpense,
  uploadExpenseReceipt,
} from "@/app/(admin)/admin/actions";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  net_amount?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  payment_method?: string | null;
  apartment_id?: string | null;
  note?: string | null;
  receipt_path?: string | null;
}

const CATEGORIES = [
  { value: "cleaning", label: "Reinigung" },
  { value: "maintenance", label: "Wartung/Reparatur" },
  { value: "supplies", label: "Material/Ausstattung" },
  { value: "utilities", label: "Nebenkosten" },
  { value: "other", label: "Sonstiges" },
];
const METHODS = [
  { value: "bank_transfer", label: "Überweisung" },
  { value: "cash", label: "Bar" },
  { value: "card", label: "Karte" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Sonstige" },
];
const VAT_RATES = ["20", "10", "0"];

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const methodLabel = (v?: string | null) => METHODS.find((m) => m.value === v)?.label ?? v ?? "";
const fmt = (n: number) => new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(n);
const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("de-AT");

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
  const [vatRate, setVatRate] = useState("20");
  const [method, setMethod] = useState("bank_transfer");
  const [apartmentId, setApartmentId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      vat_rate: Number(vatRate),
      payment_method: method,
      apartment_id: apartmentId || null,
      note: note || null,
    });
    if (res.success && res.id && file) {
      const fd = new FormData();
      fd.append("expenseId", res.id);
      fd.append("file", file);
      await uploadExpenseReceipt(fd);
    }
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Fehler beim Speichern");
      return;
    }
    setAmount("");
    setNote("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Diese Ausgabe (inkl. Beleg) löschen?")) return;
    setBusy(true);
    await deleteExpense(id);
    setBusy(false);
    router.refresh();
  };

  const handleRowUpload = async (id: string, f: File | null) => {
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("expenseId", id);
    fd.append("file", f);
    const res = await uploadExpenseReceipt(fd);
    setBusy(false);
    if (!res.success) setError(res.error ?? "Beleg-Upload fehlgeschlagen");
    else router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-stone-900 mb-1">Ausgaben</h2>
      <p className="text-xs text-stone-400 mb-4">
        Belege bitte aufbewahren (7 Jahre). USt-Betrag wird aus Brutto + Satz berechnet (Vorsteuer).
      </p>

      {/* Erfassung */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input inputMode="decimal" placeholder="Brutto €" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={inputClass}>
          {VAT_RATES.map((r) => <option key={r} value={r}>{r}% USt</option>)}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} className={inputClass}>
          <option value="">Wohnung (optional)</option>
          {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-stone-700"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {busy ? "Speichert…" : "Ausgabe + Beleg hinzufügen"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Liste */}
      {expenses.length === 0 ? (
        <p className="text-sm text-stone-400 mt-5">Noch keine Ausgaben in diesem Zeitraum.</p>
      ) : (
        <div className="mt-5 divide-y divide-stone-100">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800">
                  {fmt(e.amount)} · {catLabel(e.category)}
                  {e.vat_amount != null && e.vat_amount > 0 && (
                    <span className="text-stone-400 font-normal"> · inkl. {fmt(e.vat_amount)} USt ({e.vat_rate}%)</span>
                  )}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {fmtDate(e.expense_date)}
                  {e.payment_method ? ` · ${methodLabel(e.payment_method)}` : ""}
                  {e.apartment_id ? ` · ${apartments.find((a) => a.id === e.apartment_id)?.name ?? e.apartment_id}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {e.receipt_path ? (
                  <a
                    href={`/api/admin/expenses/${e.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#c8a96e] hover:text-[#b8985d] underline"
                  >
                    Beleg
                  </a>
                ) : (
                  <label className="text-xs text-stone-400 hover:text-stone-600 underline cursor-pointer">
                    Beleg
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(ev) => handleRowUpload(e.id, ev.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  disabled={busy}
                  aria-label="Ausgabe löschen"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
