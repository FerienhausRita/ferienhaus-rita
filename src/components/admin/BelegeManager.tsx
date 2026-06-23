"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createExpenseFromReceipt,
  confirmDraftExpense,
  deleteExpense,
} from "@/app/(admin)/admin/actions";

interface Draft {
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
  vendor?: string | null;
  source?: string | null;
  ocr_confidence?: number | null;
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
const VAT_RATES = ["20", "13", "10", "0"];

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("de-AT");

/** OCR-Freitext-Kategorie best-effort auf einen festen Code mappen. */
function mapCategory(raw?: string | null): string {
  const s = (raw || "").toLowerCase();
  if (/(reinig|wäsche|wasche|laundry|clean)/.test(s)) return "cleaning";
  if (/(reparat|instand|wartung|repair|maint)/.test(s)) return "maintenance";
  if (/(material|möbel|moebel|ausstatt|büro|buro|supplies|grocer|market|lebensmittel|hardware|baumarkt)/.test(s))
    return "supplies";
  if (/(energie|strom|gas|wasser|nebenkost|utilit|electric|power|water)/.test(s)) return "utilities";
  return "other";
}

const inputClass =
  "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

export default function BelegeManager({
  drafts,
  apartments,
}: {
  drafts: Draft[];
  apartments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    let added = 0;
    let dupes = 0;
    let failed = 0;
    let ocrMissing = 0;
    const arr = Array.from(files);
    for (let i = 0; i < arr.length; i++) {
      setProgress(`Scanne ${i + 1} / ${arr.length} …`);
      const fd = new FormData();
      fd.append("file", arr[i]);
      fd.append("source", "upload");
      const res = await createExpenseFromReceipt(fd);
      if (!res.success) failed++;
      else if (res.duplicate) dupes++;
      else {
        added++;
        if (res.ocrFailed) ocrMissing++;
      }
    }
    setBusy(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    const parts: string[] = [];
    if (added) parts.push(`${added} erkannt`);
    if (dupes) parts.push(`${dupes} Duplikat(e) übersprungen`);
    if (failed) parts.push(`${failed} fehlgeschlagen`);
    if (ocrMissing) parts.push(`${ocrMissing} ohne Auto-Auslesung (manuell prüfen)`);
    if (parts.length) setError(parts.join(" · "));
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Upload / Drop */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-1">Belege hochladen &amp; scannen</h2>
        <p className="text-xs text-stone-400 mb-4">
          Mehrere Bilder/PDFs auf einmal möglich. Sie werden automatisch ausgelesen und als
          Entwurf angelegt. Duplikate (gleiche Datei) werden erkannt und übersprungen.
        </p>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-300 rounded-2xl py-8 px-4 text-center cursor-pointer hover:border-[#c8a96e] transition-colors"
        >
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5 7.5 12M12 7.5V21" />
          </svg>
          <span className="text-sm text-stone-600">Dateien hierher ziehen oder klicken</span>
          <span className="text-xs text-stone-400">PDF, JPG, PNG · max. 15 MB</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        {(progress || error) && (
          <p className={`mt-3 text-sm ${error && !progress ? "text-stone-600" : "text-stone-500"}`}>
            {progress ?? error}
          </p>
        )}
      </div>

      {/* Prüf-Liste */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-1">
          Zu prüfen{drafts.length > 0 && <span className="text-stone-400 font-normal"> · {drafts.length}</span>}
        </h2>
        <p className="text-xs text-stone-400 mb-4">
          Felder kontrollieren/korrigieren und bestätigen. Erst bestätigte Belege zählen in die
          Finanzübersicht und Vorsteuer.
        </p>
        {drafts.length === 0 ? (
          <p className="text-sm text-stone-400">Keine offenen Belege. Alles erledigt 🎉</p>
        ) : (
          <div className="space-y-4">
            {drafts.map((d) => (
              <DraftRow key={d.id} draft={d} apartments={apartments} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraftRow({
  draft,
  apartments,
  onChanged,
}: {
  draft: Draft;
  apartments: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [date, setDate] = useState(draft.expense_date);
  const [category, setCategory] = useState(mapCategory(draft.category));
  const [amount, setAmount] = useState(draft.amount > 0 ? String(draft.amount) : "");
  const [vatRate, setVatRate] = useState(draft.vat_rate != null ? String(draft.vat_rate) : "20");
  const [method, setMethod] = useState(draft.payment_method || "bank_transfer");
  const [apartmentId, setApartmentId] = useState(draft.apartment_id || "");
  const [note, setNote] = useState(draft.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    const amt = parseFloat(amount.replace(",", "."));
    if (!date || !(amt > 0)) {
      setError("Datum und Betrag (> 0) nötig.");
      return;
    }
    setBusy(true);
    const res = await confirmDraftExpense({
      id: draft.id,
      expense_date: date,
      category,
      amount: amt,
      vat_rate: Number(vatRate),
      payment_method: method,
      apartment_id: apartmentId || null,
      note: note || null,
    });
    setBusy(false);
    if (!res.success) setError(res.error ?? "Fehler beim Bestätigen");
    else onChanged();
  };

  const discard = async () => {
    if (!confirm0("Diesen Beleg verwerfen (inkl. Datei löschen)?")) return;
    setBusy(true);
    await deleteExpense(draft.id);
    setBusy(false);
    onChanged();
  };

  return (
    <div className="border border-stone-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">
            {draft.vendor || "Beleg (kein Lieferant erkannt)"}
          </p>
          <p className="text-xs text-stone-400">
            Hochgeladen{draft.source ? ` · ${draft.source === "onedrive" ? "OneDrive" : "Upload"}` : ""}
            {draft.ocr_confidence != null ? ` · OCR-Sicherheit ${Math.round(draft.ocr_confidence * 100)}%` : ""}
          </p>
        </div>
        {draft.receipt_path && (
          <a
            href={`/api/admin/expenses/${draft.id}/receipt`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#c8a96e] hover:text-[#b8985d] underline flex-shrink-0"
          >
            Beleg ansehen
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <input placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} sm:col-span-2 lg:col-span-3`} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Bestätigen"}
        </button>
        <button
          type="button"
          onClick={discard}
          disabled={busy}
          className="text-sm text-stone-500 hover:text-red-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          Verwerfen
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-xs text-stone-400 ml-auto">erfasst: {fmtDate(draft.expense_date)}</span>
      </div>
    </div>
  );
}

// window.confirm-Wrapper (lokaler Name kollidiert sonst mit der confirm-Funktion oben)
function confirm0(msg: string): boolean {
  return typeof window === "undefined" ? true : window.confirm(msg);
}
