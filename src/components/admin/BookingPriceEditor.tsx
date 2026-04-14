"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingPrices } from "@/app/(admin)/admin/actions";

interface LineItem {
  id?: string;
  label: string;
  amount: number;
}

interface BookingPriceEditorProps {
  bookingId: string;
  nights: number;
  pricePerNight: number;
  extraGuestsTotal: number;
  dogsTotal: number;
  cleaningFee: number;
  localTaxTotal: number;
  discountAmount: number;
  totalPrice: number;
  lineItems: LineItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function BookingPriceEditor({
  bookingId,
  nights,
  pricePerNight: initialPPN,
  extraGuestsTotal: initialEG,
  dogsTotal: initialDogs,
  cleaningFee: initialCF,
  localTaxTotal: initialLT,
  discountAmount: initialDiscount,
  totalPrice: initialTotal,
  lineItems: initialLineItems,
}: BookingPriceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Work with total accommodation cost to avoid rounding errors
  const initialAccommodationTotal = round2(initialPPN * nights);

  const [accommodationTotal, setAccommodationTotal] = useState(initialAccommodationTotal);
  const [eg, setEg] = useState(initialEG);
  const [dogs, setDogs] = useState(initialDogs);
  const [cf, setCf] = useState(initialCF);
  const [lt, setLt] = useState(initialLT);
  const [discount, setDiscount] = useState(initialDiscount);
  const [items, setItems] = useState<LineItem[]>(initialLineItems);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [message, setMessage] = useState("");

  // Derived per-night for storage (back-calculate)
  const derivedPPN = nights > 0 ? round2(accommodationTotal / nights) : 0;

  const baseTotal = accommodationTotal + eg + dogs + cf + lt - discount;
  const lineItemsTotal = items.reduce((sum, li) => sum + li.amount, 0);
  const calculatedTotal = round2(baseTotal + lineItemsTotal);

  function addLineItem() {
    if (!newLabel.trim() || !newAmount) return;
    setItems([...items, { label: newLabel.trim(), amount: parseFloat(newAmount) }]);
    setNewLabel("");
    setNewAmount("");
  }

  function removeLineItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBookingPrices(
        bookingId,
        {
          price_per_night: derivedPPN,
          extra_guests_total: eg,
          dogs_total: dogs,
          cleaning_fee: cf,
          local_tax_total: lt,
          discount_amount: discount,
          nights,
        },
        items
      );
      if (result.success) {
        setMessage("Gespeichert");
        setEditing(false);
        router.refresh();
        setTimeout(() => setMessage(""), 2000);
      } else {
        setMessage(`Fehler: ${result.error}`);
      }
    });
  }

  function handleCancel() {
    setAccommodationTotal(initialAccommodationTotal);
    setEg(initialEG);
    setDogs(initialDogs);
    setCf(initialCF);
    setLt(initialLT);
    setDiscount(initialDiscount);
    setItems(initialLineItems);
    setEditing(false);
    setMessage("");
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Preisaufschlüsselung</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
          >
            Bearbeiten
          </button>
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-stone-100">
            <tr>
              <td className="py-2 text-stone-500">
                {nights} {nights === 1 ? "Nacht" : "Nächte"} x {formatCurrency(initialPPN)}
              </td>
              <td className="py-2 text-right font-medium text-stone-900">
                {formatCurrency(initialAccommodationTotal)}
              </td>
            </tr>
            {initialEG > 0 && (
              <tr>
                <td className="py-2 text-stone-500">Zusatzgäste</td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {formatCurrency(initialEG)}
                </td>
              </tr>
            )}
            {initialDogs > 0 && (
              <tr>
                <td className="py-2 text-stone-500">Hund(e)</td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {formatCurrency(initialDogs)}
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2 text-stone-500">Endreinigung</td>
              <td className="py-2 text-right font-medium text-stone-900">
                {formatCurrency(initialCF)}
              </td>
            </tr>
            {initialLT > 0 && (
              <tr>
                <td className="py-2 text-stone-500">Ortstaxe</td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {formatCurrency(initialLT)}
                </td>
              </tr>
            )}
            {initialDiscount > 0 && (
              <tr>
                <td className="py-2 text-stone-500">Rabatt</td>
                <td className="py-2 text-right font-medium text-red-600">
                  -{formatCurrency(initialDiscount)}
                </td>
              </tr>
            )}
            {initialLineItems.map((li, i) => (
              <tr key={i}>
                <td className="py-2 text-stone-500">{li.label}</td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {formatCurrency(li.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-900">
              <td className="py-3 font-bold text-stone-900 text-base">Gesamtpreis</td>
              <td className="py-3 text-right font-bold text-stone-900 text-base">
                {formatCurrency(initialTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Plausibility check: show warning if stored total doesn't match computed */}
        {Math.abs(initialTotal - round2(initialAccommodationTotal + initialEG + initialDogs + initialCF + initialLT - initialDiscount + initialLineItems.reduce((s, l) => s + l.amount, 0))) > 0.02 && (
          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              Hinweis: Der gespeicherte Gesamtpreis weicht von der berechneten Summe ab.
              Bitte Preise prüfen und neu speichern.
            </p>
          </div>
        )}

        {message && (
          <p className="text-xs text-emerald-600 mt-2">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Preise bearbeiten</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">
            Übernachtungen ({nights} {nights === 1 ? "Nacht" : "Nächte"})
          </label>
          <input
            type="number"
            step="0.01"
            value={accommodationTotal}
            onChange={(e) => setAccommodationTotal(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>
        <p className="text-xs text-stone-400 -mt-1 text-right">
          = {formatCurrency(derivedPPN)}/Nacht
        </p>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">Zusatzgäste</label>
          <input
            type="number"
            step="0.01"
            value={eg}
            onChange={(e) => setEg(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">Hund(e)</label>
          <input
            type="number"
            step="0.01"
            value={dogs}
            onChange={(e) => setDogs(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">Endreinigung</label>
          <input
            type="number"
            step="0.01"
            value={cf}
            onChange={(e) => setCf(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">Ortstaxe</label>
          <input
            type="number"
            step="0.01"
            value={lt}
            onChange={(e) => setLt(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-stone-500 flex-1">Rabatt</label>
          <input
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="w-28 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>

        {/* Line items */}
        {items.length > 0 && (
          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-700 mb-2">Zusätzliche Positionen</p>
            {items.map((li, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-sm text-stone-600 flex-1">{li.label}</span>
                <span className="text-sm font-medium w-20 text-right">{formatCurrency(li.amount)}</span>
                <button
                  onClick={() => removeLineItem(i)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add line item */}
        <div className="pt-2 border-t border-stone-100">
          <p className="text-xs font-semibold text-stone-700 mb-2">Position hinzufügen</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Bezeichnung"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Betrag"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 text-right rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
            <button
              onClick={addLineItem}
              disabled={!newLabel.trim() || !newAmount}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-700 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="pt-3 border-t-2 border-stone-900 flex justify-between">
          <span className="font-bold text-stone-900">Gesamtpreis</span>
          <span className="font-bold text-stone-900">{formatCurrency(calculatedTotal)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "Speichern..." : "Speichern"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>

        {message && (
          <p className={`text-xs mt-1 ${message.startsWith("Fehler") ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
