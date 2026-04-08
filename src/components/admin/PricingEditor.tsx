"use client";

import { useState } from "react";
import {
  updateApartmentPricing,
  updateSeasonConfig,
  createSeasonPeriod,
  deleteSeasonPeriod,
  updateTaxConfig,
} from "@/app/(admin)/admin/actions";

interface PricingEditorProps {
  apartments: {
    id: string;
    name: string;
    base_price: number;
    extra_person_price: number;
    cleaning_fee: number;
    dog_fee: number;
  }[];
  seasonConfigs: {
    type: string;
    label: string;
    multiplier: number;
    min_nights: number;
  }[];
  seasonPeriods: {
    id: string;
    type: string;
    start_mmdd: string;
    end_mmdd: string;
    label: string;
  }[];
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
  apt: PricingEditorProps["apartments"][number];
}) {
  const [basePrice, setBasePrice] = useState(apt.base_price);
  const [extraPersonPrice, setExtraPersonPrice] = useState(
    apt.extra_person_price
  );
  const [cleaningFee, setCleaningFee] = useState(apt.cleaning_fee);
  const [dogFee, setDogFee] = useState(apt.dog_fee);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const result = await updateApartmentPricing(apt.id, {
      base_price: basePrice,
      extra_person_price: extraPersonPrice,
      cleaning_fee: cleaningFee,
      dog_fee: dogFee,
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

  return (
    <div className="p-4 border border-stone-100 rounded-xl">
      <h3 className="font-medium text-stone-900 mb-3">{apt.name}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Basispreis/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Zusatzperson/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={extraPersonPrice}
            onChange={(e) => setExtraPersonPrice(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
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
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Hundegebühr/Nacht
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={dogFee}
            onChange={(e) => setDogFee(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
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

// ─── Season Config Section ────────────────────────────────────

function SeasonConfigCard({
  config,
}: {
  config: PricingEditorProps["seasonConfigs"][number];
}) {
  const [multiplier, setMultiplier] = useState(config.multiplier);
  const [minNights, setMinNights] = useState(config.min_nights);
  const [label, setLabel] = useState(config.label);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const colorClass =
    config.type === "high"
      ? "bg-amber-50 border-amber-200"
      : config.type === "mid"
      ? "bg-blue-50 border-blue-200"
      : "bg-stone-50 border-stone-200";

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const result = await updateSeasonConfig(config.type, {
      multiplier,
      min_nights: minNights,
      label,
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

  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Bezeichnung
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Faktor
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
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
              value={minNights}
              onChange={(e) => setMinNights(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
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
    </div>
  );
}

// ─── Season Periods Section ───────────────────────────────────

function SeasonPeriodsSection({
  periods: initialPeriods,
}: {
  periods: PricingEditorProps["seasonPeriods"];
}) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // New period form
  const [newType, setNewType] = useState<string>("high");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleDelete = async (id: string) => {
    if (!confirm("Zeitraum wirklich löschen?")) return;
    setLoading(`delete-${id}`);
    setStatus(null);
    const result = await deleteSeasonPeriod(id);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStart || !newEnd || !newLabel.trim()) return;

    setLoading("create");
    setStatus(null);
    const result = await createSeasonPeriod({
      type: newType,
      start_mmdd: newStart,
      end_mmdd: newEnd,
      label: newLabel.trim(),
    });
    if (result.success) {
      setPeriods((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: newType,
          start_mmdd: newStart,
          end_mmdd: newEnd,
          label: newLabel.trim(),
        },
      ]);
      setNewType("high");
      setNewStart("");
      setNewEnd("");
      setNewLabel("");
      setStatus({ type: "success", message: "Zeitraum erstellt" });
    } else {
      setStatus({
        type: "error",
        message: result.error ?? "Fehler beim Erstellen",
      });
    }
    setLoading(null);
    setTimeout(() => setStatus(null), 3000);
  };

  const dotColor = (type: string) =>
    type === "high"
      ? "bg-amber-400"
      : type === "mid"
      ? "bg-blue-400"
      : "bg-stone-300";

  return (
    <div>
      {/* Existing periods */}
      <div className="space-y-1.5 mb-4">
        {periods.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 text-sm py-1.5 group"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${dotColor(p.type)}`}
            />
            <span className="text-stone-500 w-28 shrink-0 font-mono text-xs">
              {p.start_mmdd} – {p.end_mmdd}
            </span>
            <span className="text-stone-700 flex-1">{p.label}</span>
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
          <p className="text-sm text-stone-400">Keine Zeiträume definiert</p>
        )}
      </div>

      {/* Add new period form */}
      <form
        onSubmit={handleCreate}
        className="p-4 bg-stone-50 rounded-xl space-y-3"
      >
        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Neuer Zeitraum
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Saison
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            >
              <option value="high">Hochsaison</option>
              <option value="mid">Zwischensaison</option>
              <option value="low">Nebensaison</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Start (MM-DD)
            </label>
            <input
              type="text"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              placeholder="z.B. 07-01"
              pattern="\d{2}-\d{2}"
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
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
              placeholder="z.B. 08-31"
              pattern="\d{2}-\d{2}"
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Bezeichnung
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="z.B. Sommerhochsaison"
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading === "create"}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === "create" ? "Erstellen..." : "+ Zeitraum hinzufügen"}
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
  seasonConfigs,
  seasonPeriods,
  taxConfig,
}: PricingEditorProps) {
  return (
    <div className="space-y-6">
      {/* Apartment Pricing */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Wohnungspreise</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Basispreise, Zusatzgebühren und Reinigung pro Wohnung
          </p>
        </div>
        <div className="p-5 space-y-4">
          {apartments.map((apt) => (
            <ApartmentPricingCard key={apt.id} apt={apt} />
          ))}
        </div>
      </div>

      {/* Season Configs */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Saisonkonfiguration</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Preisfaktoren und Mindestaufenthalt pro Saisontyp
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {seasonConfigs.map((config) => (
            <SeasonConfigCard key={config.type} config={config} />
          ))}
        </div>
      </div>

      {/* Season Periods */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Saisonzeiträume</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Welcher Zeitraum gehört zu welcher Saison (MM-DD Format)
          </p>
        </div>
        <div className="p-5">
          <SeasonPeriodsSection periods={seasonPeriods} />
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
