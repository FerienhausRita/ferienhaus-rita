"use client";

import { useState } from "react";
import {
  updateApartmentPricing,
  createSpecialPeriod,
  updateSpecialPeriod,
  deleteSpecialPeriod,
  updateTaxConfig,
} from "@/app/(admin)/admin/actions";

interface ApartmentPricingData {
  id: string;
  name: string;
  summer_price: number;
  winter_price: number;
  extra_person_price: number;
  extra_adult_price?: number;
  extra_child_price?: number;
  cleaning_fee: number;
  dog_fee: number;
  first_dog_fee?: number;
  additional_dog_fee?: number;
  min_nights_summer: number;
  min_nights_winter: number;
}

interface SpecialPeriodData {
  id: string;
  label: string;
  start_mmdd: string;
  end_mmdd: string;
  surcharge_percent: number;
  min_nights: number | null;
  active: boolean;
}

interface PricingEditorProps {
  apartments: ApartmentPricingData[];
  specialPeriods: SpecialPeriodData[];
  taxConfig: { localTaxPerNight: number; vatRate: number };
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function StatusMessage({
  status,
}: {
  status: { type: "success" | "error"; message: string } | null;
}) {
  if (!status) return null;
  return (
    <p
      className={`text-xs mt-2 ${
        status.type === "success" ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {status.message}
    </p>
  );
}

// ─── Apartment Pricing Section ────────────────────────────────

function ApartmentPricingCard({
  apt,
}: {
  apt: ApartmentPricingData;
}) {
  const [summerPrice, setSummerPrice] = useState(apt.summer_price);
  const [winterPrice, setWinterPrice] = useState(apt.winter_price);
  const [extraAdultPrice, setExtraAdultPrice] = useState(
    apt.extra_adult_price ?? apt.extra_person_price
  );
  // Kleinkinder unter 3 sind kostenfrei — kein eigenes Input mehr.
  // extraChildPrice spiegeln wir hinter den Kulissen auf den Erwachsenen-Preis,
  // damit Code-Pfade, die das Feld noch lesen, konsistente Werte bekommen.
  const extraChildPrice = extraAdultPrice;
  const _setExtraChildPrice = (_v: number) => {}; void _setExtraChildPrice;
  const [cleaningFee, setCleaningFee] = useState(apt.cleaning_fee);
  const [firstDogFee, setFirstDogFee] = useState(apt.first_dog_fee ?? apt.dog_fee);
  const [additionalDogFee, setAdditionalDogFee] = useState(apt.additional_dog_fee ?? 7.5);
  const [minNightsSummer, setMinNightsSummer] = useState(apt.min_nights_summer);
  const [minNightsWinter, setMinNightsWinter] = useState(apt.min_nights_winter);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const result = await updateApartmentPricing(apt.id, {
      summer_price: summerPrice,
      winter_price: winterPrice,
      base_price: summerPrice, // Keep base_price synced for legacy compatibility
      extra_person_price: extraAdultPrice, // Legacy-Feld auf Erw.-Preis spiegeln
      extra_adult_price: extraAdultPrice,
      extra_child_price: extraChildPrice,
      cleaning_fee: cleaningFee,
      dog_fee: firstDogFee, // Legacy-Feld auf 1.-Hund-Preis spiegeln
      first_dog_fee: firstDogFee,
      additional_dog_fee: additionalDogFee,
      min_nights_summer: minNightsSummer,
      min_nights_winter: minNightsWinter,
    });
    if (result.success) {
      setStatus({ type: "success", message: "Gespeichert" });
    } else {
      setStatus({
        type: "error",
        message: result.error ?? "Fehler beim Speichern",
      });
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const inputClass =
    "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  return (
    <div className="p-4 border border-stone-100 rounded-xl">
      <h3 className="font-medium text-stone-900 mb-3">{apt.name}</h3>

      {/* Season prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Sommerpreis/Nacht
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={summerPrice}
              onChange={(e) => setSummerPrice(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-0.5">01.05. – 30.11.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Winterpreis/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={winterPrice}
            onChange={(e) => setWinterPrice(Number(e.target.value))}
            className={inputClass}
          />
          <p className="text-[10px] text-stone-400 mt-0.5">01.12. – 30.04.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Min. Nächte Sommer
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={minNightsSummer}
            onChange={(e) => setMinNightsSummer(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Min. Nächte Winter
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={minNightsWinter}
            onChange={(e) => setMinNightsWinter(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Fixed fees */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Zusatzperson/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={extraAdultPrice}
            onChange={(e) => setExtraAdultPrice(Number(e.target.value))}
            className={inputClass}
          />
          <p className="text-[10px] text-stone-400 mt-0.5">
            Einheitlich für alle ab 3 J. — Kleinkinder unter 3 sind kostenfrei.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Endreinigung
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cleaningFee}
            onChange={(e) => setCleaningFee(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            1. Hund/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={firstDogFee}
            onChange={(e) => setFirstDogFee(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            jeder weitere Hund/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={additionalDogFee}
            onChange={(e) => setAdditionalDogFee(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
        <StatusMessage status={status} />
      </div>
    </div>
  );
}

// ─── Special Periods Section ─────────────────────────────────

function SpecialPeriodsSection({
  periods: initialPeriods,
}: {
  periods: SpecialPeriodData[];
}) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // New period form
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newSurcharge, setNewSurcharge] = useState(10);
  const [newMinNights, setNewMinNights] = useState<number | "">(5);

  const handleDelete = async (id: string) => {
    if (!confirm("Sonderzeitraum wirklich löschen?")) return;
    setLoading(`delete-${id}`);
    setStatus(null);
    const result = await deleteSpecialPeriod(id);
    if (result.success) {
      setPeriods((prev) => prev.filter((p) => p.id !== id));
      setStatus({ type: "success", message: "Gelöscht" });
    } else {
      setStatus({
        type: "error",
        message: result.error ?? "Fehler beim Löschen",
      });
    }
    setLoading(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    setLoading(`toggle-${id}`);
    const result = await updateSpecialPeriod(id, { active: !currentActive });
    if (result.success) {
      setPeriods((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !currentActive } : p))
      );
    }
    setLoading(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStart || !newEnd || !newLabel.trim()) return;

    setLoading("create");
    setStatus(null);
    const result = await createSpecialPeriod({
      label: newLabel.trim(),
      start_mmdd: newStart,
      end_mmdd: newEnd,
      surcharge_percent: newSurcharge,
      min_nights: newMinNights === "" ? null : newMinNights,
    });
    if (result.success) {
      setPeriods((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: newLabel.trim(),
          start_mmdd: newStart,
          end_mmdd: newEnd,
          surcharge_percent: newSurcharge,
          min_nights: newMinNights === "" ? null : newMinNights,
          active: true,
        },
      ]);
      setNewLabel("");
      setNewStart("");
      setNewEnd("");
      setNewSurcharge(10);
      setNewMinNights(5);
      setStatus({ type: "success", message: "Sonderzeitraum erstellt" });
    } else {
      setStatus({
        type: "error",
        message: result.error ?? "Fehler beim Erstellen",
      });
    }
    setLoading(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const inputClass =
    "w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  return (
    <div>
      {/* Existing periods */}
      <div className="space-y-2 mb-4">
        {periods.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl border group ${
              p.active
                ? "bg-amber-50/50 border-amber-200"
                : "bg-stone-50 border-stone-200 opacity-60"
            }`}
          >
            <button
              onClick={() => handleToggle(p.id, p.active)}
              disabled={loading !== null}
              className="shrink-0"
              title={p.active ? "Deaktivieren" : "Aktivieren"}
            >
              <span
                className={`block w-4 h-4 rounded border-2 ${
                  p.active
                    ? "bg-amber-400 border-amber-500"
                    : "bg-white border-stone-300"
                }`}
              />
            </button>
            <span className="text-stone-500 w-28 shrink-0 font-mono text-xs">
              {p.start_mmdd} – {p.end_mmdd}
            </span>
            <span className="text-stone-700 flex-1 font-medium">{p.label}</span>
            <span className="text-amber-700 font-semibold text-xs bg-amber-100 px-2 py-0.5 rounded-full">
              +{p.surcharge_percent}%
            </span>
            {p.min_nights !== null && (
              <span className="text-stone-500 text-xs">
                min. {p.min_nights}N
              </span>
            )}
            <button
              onClick={() => handleDelete(p.id)}
              disabled={loading !== null}
              className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              title="Löschen"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        ))}
        {periods.length === 0 && (
          <p className="text-sm text-stone-400">Keine Sonderzeiträume definiert</p>
        )}
      </div>

      {/* Add new period form */}
      <form
        onSubmit={handleCreate}
        className="p-4 bg-stone-50 rounded-xl space-y-3"
      >
        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Neuer Sonderzeitraum
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Bezeichnung
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="z.B. Weihnachten"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Start (MM-DD)
            </label>
            <input
              type="text"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              placeholder="z.B. 12-20"
              pattern="\d{2}-\d{2}"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Ende (MM-DD)
            </label>
            <input
              type="text"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              placeholder="z.B. 01-06"
              pattern="\d{2}-\d{2}"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Aufschlag %
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={newSurcharge}
              onChange={(e) => setNewSurcharge(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Min. Nächte
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={newMinNights}
              onChange={(e) =>
                setNewMinNights(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="optional"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading === "create"}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === "create" ? "Erstellen..." : "+ Sonderzeitraum hinzufügen"}
          </button>
          <StatusMessage status={status} />
        </div>
      </form>
    </div>
  );
}

// ─── Tax Config Section ───────────────────────────────────────

function TaxConfigSection({
  taxConfig,
}: {
  taxConfig: PricingEditorProps["taxConfig"];
}) {
  const [localTax, setLocalTax] = useState(taxConfig.localTaxPerNight);
  const [vatRate, setVatRate] = useState(taxConfig.vatRate);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    const [r1, r2] = await Promise.all([
      updateTaxConfig("local_tax", localTax),
      updateTaxConfig("vat", vatRate),
    ]);

    if (r1.success && r2.success) {
      setStatus({ type: "success", message: "Gespeichert" });
    } else {
      setStatus({
        type: "error",
        message: r1.error ?? r2.error ?? "Fehler beim Speichern",
      });
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Ortstaxe pro Person/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={localTax}
            onChange={(e) => setLocalTax(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            MwSt.-Satz
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
          <p className="text-xs text-stone-400 mt-1">
            z.B. 0.10 = 10%, 0.13 = 13%
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
        <StatusMessage status={status} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function PricingEditor({
  apartments,
  specialPeriods,
  taxConfig,
}: PricingEditorProps) {
  return (
    <div className="space-y-6">
      {/* Apartment Pricing */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Wohnungspreise</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Sommer- und Winterpreise, Mindestaufenthalt und Zusatzgebühren pro Wohnung
          </p>
        </div>
        <div className="p-5 space-y-4">
          {apartments.map((apt) => (
            <ApartmentPricingCard key={apt.id} apt={apt} />
          ))}
        </div>
      </div>

      {/* Season Info */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Saisonzeiträume</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Feste Saisongrenzen für die Preisberechnung
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-2xl">&#9728;</span>
              <div>
                <p className="font-medium text-stone-900">Sommer</p>
                <p className="text-sm text-stone-600">01. Mai – 30. November</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-2xl">&#10052;</span>
              <div>
                <p className="font-medium text-stone-900">Winter</p>
                <p className="text-sm text-stone-600">01. Dezember – 30. April</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Special Periods */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Sonderzeiträume</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Prozentualer Aufschlag auf den jeweiligen Saisonpreis (Sommer/Winter)
          </p>
        </div>
        <div className="p-5">
          <SpecialPeriodsSection periods={specialPeriods} />
        </div>
      </div>

      {/* Tax Config */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Steuern & Abgaben</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Ortstaxe und Mehrwertsteuer
          </p>
        </div>
        <div className="p-5">
          <TaxConfigSection taxConfig={taxConfig} />
        </div>
      </div>
    </div>
  );
}
