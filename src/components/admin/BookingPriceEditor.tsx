"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingPrices, recalculateBookingPricesAction } from "@/app/(admin)/admin/actions";

interface LineItem {
  id?: string;
  label: string;
  amount: number;
}

interface BookingPriceEditorProps {
  bookingId: string;
  nights: number;
  adults: number;
  children: number;
  dogs: number;
  baseGuests: number;
  pricePerNight: number;
  extraGuestsTotal: number;
  dogsTotal: number;
  cleaningFee: number;
  localTaxTotal: number;
  discountAmount: number;
  totalPrice: number;
  lineItems: LineItem[];
  // Unit prices for breakdown display
  dogFeePerNight: number;
  extraPersonPrice: number;
  extraAdultPrice: number;
  extraChildPrice: number;
  firstDogFee: number;
  additionalDogFee: number;
  localTaxPerNight: number;
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
  adults,
  children,
  dogs: dogsCount,
  baseGuests,
  pricePerNight: initialPPN,
  extraGuestsTotal: initialEG,
  dogsTotal: initialDogs,
  cleaningFee: initialCF,
  localTaxTotal: initialLT,
  discountAmount: initialDiscount,
  totalPrice: initialTotal,
  lineItems: initialLineItems,
  dogFeePerNight,
  extraPersonPrice,
  extraAdultPrice,
  extraChildPrice: _extraChildPrice,
  firstDogFee,
  additionalDogFee,
  localTaxPerNight,
}: BookingPriceEditorProps) {
  void _extraChildPrice; // Backwards-Compat: Prop bleibt, wird aber nicht mehr genutzt

  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Derived initial values
  const initialAccommodationTotal = round2(initialPPN * nights);
  // adults + children additiv (children = ältere Kinder, additiver Wert),
  // infants kostenfrei zählen nicht.
  const initialExtraGuests = Math.max(0, adults + children - baseGuests);
  const initialExtraPersonPPN = initialExtraGuests > 0 ? round2(initialEG / (initialExtraGuests * nights)) : extraPersonPrice;
  const initialDogFeePPN = dogsCount > 0 ? round2(initialDogs / (dogsCount * nights)) : dogFeePerNight;
  const initialLocalTaxPPN = adults > 0 && nights > 0 ? round2(initialLT / (adults * nights)) : localTaxPerNight;

  // Editable unit values
  const [editPPN, setEditPPN] = useState(initialPPN);
  const [editNights, setEditNights] = useState(nights);
  const [editAdults, setEditAdults] = useState(adults);
  const [editChildren, setEditChildren] = useState(children);
  const [editDogsCount, setEditDogsCount] = useState(dogsCount);
  const [editDogFeePPN, setEditDogFeePPN] = useState(initialDogFeePPN);
  const [editExtraPersonPPN, setEditExtraPersonPPN] = useState(initialExtraPersonPPN);
  const [editCF, setEditCF] = useState(initialCF);
  const [editLocalTaxPPN, setEditLocalTaxPPN] = useState(initialLocalTaxPPN);
  const [discount, setDiscount] = useState(initialDiscount);
  const [items, setItems] = useState<LineItem[]>(initialLineItems);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [message, setMessage] = useState("");

  // Auto-calculated totals from unit values
  const calcAccommodation = round2(editPPN * editNights);
  // adults + children additiv, infants gratis
  const calcExtraGuests = Math.max(0, editAdults + editChildren - baseGuests);
  const calcExtraGuestsTotal = round2(calcExtraGuests * editExtraPersonPPN * editNights);
  const calcDogsTotal = round2(editDogsCount * editDogFeePPN * editNights);
  const calcLocalTax = round2(editAdults * editLocalTaxPPN * editNights);
  const calcSubtotal = calcAccommodation + calcExtraGuestsTotal + calcDogsTotal + editCF + calcLocalTax - discount;
  const lineItemsTotal = items.reduce((sum, li) => sum + li.amount, 0);
  const calculatedTotal = round2(calcSubtotal + lineItemsTotal);

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
          price_per_night: editPPN,
          extra_guests_total: calcExtraGuestsTotal,
          dogs_total: calcDogsTotal,
          cleaning_fee: editCF,
          local_tax_total: calcLocalTax,
          discount_amount: discount,
          nights: editNights,
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

  // Recalculate in edit mode: populate unit prices from pricing engine
  function handleRecalculate() {
    startTransition(async () => {
      const result = await recalculateBookingPricesAction(bookingId);
      if (result.success && result.prices) {
        setEditPPN(result.prices.pricePerNight);
        setEditNights(result.prices.nights);
        setEditCF(result.prices.cleaningFee);
        setDiscount(result.prices.discountAmount);
        setMessage("Preise neu berechnet – bitte prüfen und speichern");
      } else {
        setMessage(`Fehler: ${result.error}`);
      }
    });
  }

  // Recalculate + save in one step (for read mode)
  function handleRecalculateAndSave() {
    startTransition(async () => {
      const result = await recalculateBookingPricesAction(bookingId);
      if (result.success && result.prices) {
        const saveResult = await updateBookingPrices(
          bookingId,
          {
            price_per_night: result.prices.pricePerNight,
            extra_guests_total: result.prices.extraGuestsTotal,
            dogs_total: result.prices.dogsTotal,
            cleaning_fee: result.prices.cleaningFee,
            local_tax_total: result.prices.localTaxTotal,
            discount_amount: result.prices.discountAmount,
            nights: result.prices.nights,
          },
          items // bestehende Line Items beibehalten
        );
        if (saveResult.success) {
          setMessage("Preise neu berechnet und gespeichert");
          router.refresh();
          setTimeout(() => setMessage(""), 3000);
        } else {
          setMessage(`Fehler beim Speichern: ${saveResult.error}`);
        }
      } else {
        setMessage(`Fehler: ${result.error}`);
      }
    });
  }

  function handleCancel() {
    setEditPPN(initialPPN);
    setEditNights(nights);
    setEditAdults(adults);
    setEditChildren(children);
    setEditDogsCount(dogsCount);
    setEditDogFeePPN(initialDogFeePPN);
    setEditExtraPersonPPN(initialExtraPersonPPN);
    setEditCF(initialCF);
    setEditLocalTaxPPN(initialLocalTaxPPN);
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculateAndSave}
              disabled={isPending}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {isPending ? "Berechne..." : "Neu berechnen"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
            >
              Bearbeiten
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-stone-100">
            {/* Übernachtungen */}
            <tr>
              <td className="py-2">
                <span className="text-stone-900">Übernachtungen</span>
                <span className="block text-xs text-stone-400">
                  {nights} {nights === 1 ? "Nacht" : "Nächte"} × {formatCurrency(initialPPN)}/Nacht
                </span>
              </td>
              <td className="py-2 text-right font-medium text-stone-900">
                {formatCurrency(initialAccommodationTotal)}
              </td>
            </tr>

            {/* Zusatzgäste — einheitlicher Tarif für alle ab 3 J. */}
            {(() => {
              const extraGuests = Math.max(0, adults + children - baseGuests);
              const computed = round2(extraGuests * extraAdultPrice * nights);
              const rows = [];
              if (extraGuests > 0 || initialEG > 0) {
                rows.push(
                  <tr key="extra-guests">
                    <td className="py-2">
                      <span className="text-stone-900">Zusatzgäste</span>
                      <span className="block text-xs text-stone-400">
                        {extraGuests > 0
                          ? `${extraGuests} × ${formatCurrency(extraAdultPrice)}/Nacht × ${nights} Nächte`
                          : `Keine (${adults + children} G\u00e4ste, ${baseGuests} inkl.)`}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium text-stone-900">
                      {formatCurrency(initialEG > 0 ? initialEG : computed)}
                    </td>
                  </tr>
                );
              }
              if (Math.abs(computed - initialEG) > 0.02 && initialEG > 0) {
                rows.push(
                  <tr key="extra-diff">
                    <td className="py-1 text-[11px] text-amber-600 italic">
                      gespeicherter Zusatzgäste-Total weicht ab: {formatCurrency(initialEG)}
                    </td>
                    <td></td>
                  </tr>
                );
              }
              if (children > 0) {
                rows.push(
                  <tr key="infants-info">
                    <td className="py-1 text-[11px] text-stone-400 italic" colSpan={2}>
                      + {children} Kleinkind{children === 1 ? "" : "er"} unter 3 J. (kostenfrei)
                    </td>
                  </tr>
                );
              }
              return rows;
            })()}

            {/* Hunde — mit Staffelung */}
            {(dogsCount > 0 || initialDogs > 0) && (() => {
              const dogsPerNight = dogsCount === 0
                ? 0
                : firstDogFee + Math.max(0, dogsCount - 1) * additionalDogFee;
              const dogsCalc = round2(dogsPerNight * nights);
              return (
                <tr>
                  <td className="py-2">
                    <span className="text-stone-900">{dogsCount === 1 ? "Hund" : "Hunde"}</span>
                    <span className="block text-xs text-stone-400">
                      {dogsCount === 0
                        ? `0 Hunde`
                        : dogsCount === 1
                        ? `1 × ${formatCurrency(firstDogFee)}/Nacht × ${nights} Nächte`
                        : `1×${formatCurrency(firstDogFee)} + ${dogsCount - 1}×${formatCurrency(additionalDogFee)}/Nacht × ${nights} Nächte`}
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium text-stone-900">
                    {formatCurrency(initialDogs > 0 ? initialDogs : dogsCalc)}
                  </td>
                </tr>
              );
            })()}

            {/* Endreinigung */}
            <tr>
              <td className="py-2">
                <span className="text-stone-900">Endreinigung</span>
                <span className="block text-xs text-stone-400">1× pauschal</span>
              </td>
              <td className="py-2 text-right font-medium text-stone-900">
                {formatCurrency(initialCF)}
              </td>
            </tr>

            {/* Ortstaxe */}
            {initialLT > 0 && (
              <tr>
                <td className="py-2">
                  <span className="text-stone-900">Ortstaxe</span>
                  <span className="block text-xs text-stone-400">
                    {adults} Erw. × {formatCurrency(localTaxPerNight)}/Nacht × {nights} Nächte
                  </span>
                </td>
                <td className="py-2 text-right font-medium text-stone-900">
                  {formatCurrency(initialLT)}
                </td>
              </tr>
            )}

            {/* Rabatt */}
            {initialDiscount > 0 && (
              <tr>
                <td className="py-2 text-stone-900">Rabatt</td>
                <td className="py-2 text-right font-medium text-red-600">
                  -{formatCurrency(initialDiscount)}
                </td>
              </tr>
            )}

            {/* Zusätzliche Positionen */}
            {initialLineItems.map((li, i) => (
              <tr key={i}>
                <td className="py-2 text-stone-900">{li.label}</td>
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

  const inputCls = "w-20 text-right rounded-lg border border-stone-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-900">Preise bearbeiten</h2>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-stone-400 uppercase tracking-wider">
            <th className="text-left py-1 font-medium">Position</th>
            <th className="text-right py-1 font-medium">Anzahl</th>
            <th className="text-right py-1 font-medium">Preis/Einh.</th>
            <th className="text-right py-1 font-medium">Nächte</th>
            <th className="text-right py-1 font-medium">Summe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {/* Übernachtungen */}
          <tr>
            <td className="py-2 text-stone-900">Übernachtungen</td>
            <td className="py-2 text-right">
              <input type="number" min={1} value={editNights} onChange={(e) => setEditNights(parseInt(e.target.value) || 1)} className={inputCls} />
            </td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={editPPN} onChange={(e) => setEditPPN(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right text-stone-400">—</td>
            <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(calcAccommodation)}</td>
          </tr>

          {/* Zusatzgäste */}
          <tr>
            <td className="py-2">
              <span className="text-stone-900">Zusatzgäste</span>
              <span className="block text-[10px] text-stone-400">
                {editAdults + editChildren} Gäste, {baseGuests} inkl. → {calcExtraGuests} extra
              </span>
            </td>
            <td className="py-2 text-right text-stone-500 text-xs">{calcExtraGuests}</td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={editExtraPersonPPN} onChange={(e) => setEditExtraPersonPPN(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right text-stone-500 text-xs">× {editNights}</td>
            <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(calcExtraGuestsTotal)}</td>
          </tr>

          {/* Hunde */}
          <tr>
            <td className="py-2 text-stone-900">Hunde</td>
            <td className="py-2 text-right">
              <input type="number" min={0} value={editDogsCount} onChange={(e) => setEditDogsCount(parseInt(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={editDogFeePPN} onChange={(e) => setEditDogFeePPN(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right text-stone-500 text-xs">× {editNights}</td>
            <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(calcDogsTotal)}</td>
          </tr>

          {/* Endreinigung */}
          <tr>
            <td className="py-2 text-stone-900">Endreinigung</td>
            <td className="py-2 text-right text-stone-500 text-xs">1×</td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={editCF} onChange={(e) => setEditCF(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right text-stone-400">—</td>
            <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(editCF)}</td>
          </tr>

          {/* Ortstaxe */}
          <tr>
            <td className="py-2">
              <span className="text-stone-900">Ortstaxe</span>
              <span className="block text-[10px] text-stone-400">nur Erwachsene</span>
            </td>
            <td className="py-2 text-right">
              <input type="number" min={1} value={editAdults} onChange={(e) => setEditAdults(parseInt(e.target.value) || 1)} className={inputCls} />
            </td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={editLocalTaxPPN} onChange={(e) => setEditLocalTaxPPN(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right text-stone-500 text-xs">× {editNights}</td>
            <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(calcLocalTax)}</td>
          </tr>

          {/* Rabatt */}
          <tr>
            <td className="py-2 text-stone-900">Rabatt</td>
            <td className="py-2" colSpan={2}></td>
            <td className="py-2 text-right">
              <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className={inputCls} />
            </td>
            <td className="py-2 text-right font-medium text-red-600">
              {discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0)}
            </td>
          </tr>

          {/* Zusätzliche Positionen */}
          {items.map((li, i) => (
            <tr key={i}>
              <td className="py-2 text-stone-900" colSpan={3}>
                <span className="flex items-center gap-1.5">
                  {li.label}
                  <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </td>
              <td className="py-2"></td>
              <td className="py-2 text-right font-medium text-stone-900">{formatCurrency(li.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-900">
            <td colSpan={4} className="py-3 font-bold text-stone-900 text-base">Gesamtpreis</td>
            <td className="py-3 text-right font-bold text-stone-900 text-base">{formatCurrency(calculatedTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="space-y-3 mt-3">
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

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleRecalculate}
            disabled={isPending}
            className="px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 rounded-lg transition-colors border border-blue-200 disabled:opacity-50"
          >
            {isPending ? "Berechne..." : "Neu berechnen"}
          </button>
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
