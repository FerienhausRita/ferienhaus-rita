"use client";

import { useState } from "react";
import {
  createDiscountCode,
  toggleDiscountCode,
  deleteDiscountCode,
} from "@/app/(admin)/admin/actions";

interface DiscountCode {
  id: string;
  code: string;
  type: string;
  value: number;
  label: string;
  min_subtotal: number;
  max_uses: number;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
}

interface DiscountManagerProps {
  initialCodes: DiscountCode[];
}

export default function DiscountManager({ initialCodes }: DiscountManagerProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const resetForm = () => {
    setCode("");
    setType("percent");
    setValue("");
    setLabel("");
    setMinSubtotal("");
    setMaxUses("");
    setValidFrom("");
    setValidUntil("");
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value || !label.trim()) return;

    setLoading("create");
    const result = await createDiscountCode({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      label: label.trim(),
      min_subtotal: minSubtotal ? Number(minSubtotal) : undefined,
      max_uses: maxUses ? Number(maxUses) : undefined,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
    });

    if (result.success) {
      setCodes((prev) => [
        {
          id: crypto.randomUUID(),
          code: code.trim().toUpperCase(),
          type,
          value: Number(value),
          label: label.trim(),
          min_subtotal: minSubtotal ? Number(minSubtotal) : 0,
          max_uses: maxUses ? Number(maxUses) : 0,
          current_uses: 0,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          active: true,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      resetForm();
    }
    setLoading(null);
  };

  const handleToggle = async (dc: DiscountCode) => {
    setLoading(`toggle-${dc.id}`);
    const result = await toggleDiscountCode(dc.id, dc.active);
    if (result.success) {
      setCodes((prev) =>
        prev.map((c) =>
          c.id === dc.id ? { ...c, active: !c.active } : c
        )
      );
    }
    setLoading(null);
  };

  const handleDelete = async (dc: DiscountCode) => {
    if (!confirm(`Code "${dc.code}" wirklich löschen?`)) return;
    setLoading(`delete-${dc.id}`);
    const result = await deleteDiscountCode(dc.id);
    if (result.success) {
      setCodes((prev) => prev.filter((c) => c.id !== dc.id));
    }
    setLoading(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">Rabattcodes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Neuer Code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-5 border-b border-stone-100 space-y-3 bg-stone-50"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z.B. SOMMER2026"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Bezeichnung
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. 15% Sommerrabatt"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Art
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "percent" | "fixed")}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              >
                <option value="percent">Prozent</option>
                <option value="fixed">Fixbetrag (EUR)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Wert
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percent" ? "10" : "50"}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Mindestbetrag
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={minSubtotal}
                onChange={(e) => setMinSubtotal(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Max. Nutzungen
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="0 = unbegrenzt"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Gültig ab (optional)
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Gültig bis (optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading === "create"}
              className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading === "create" ? "Erstellen..." : "Code erstellen"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Codes list */}
      <div className="divide-y divide-stone-100">
        {codes.length === 0 ? (
          <p className="p-5 text-sm text-stone-400 text-center">
            Noch keine Rabattcodes
          </p>
        ) : (
          codes.map((dc) => (
            <div
              key={dc.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center gap-3 ${
                !dc.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="px-2 py-1 bg-stone-100 rounded-lg text-sm font-mono font-bold text-stone-800">
                    {dc.code}
                  </code>
                  <span className="text-sm text-stone-600">
                    {dc.type === "percent"
                      ? `${dc.value}%`
                      : `${dc.value} EUR`}
                  </span>
                  {!dc.active && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                      Inaktiv
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-500 mt-1">{dc.label}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                  {dc.min_subtotal > 0 && (
                    <span>Min. {dc.min_subtotal} EUR</span>
                  )}
                  {dc.max_uses > 0 && (
                    <span>
                      {dc.current_uses}/{dc.max_uses} genutzt
                    </span>
                  )}
                  {dc.max_uses === 0 && (
                    <span>Unbegrenzt</span>
                  )}
                  {dc.valid_from && (
                    <span>
                      Ab{" "}
                      {new Date(dc.valid_from).toLocaleDateString("de-AT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {dc.valid_until && (
                    <span>
                      Bis{" "}
                      {new Date(dc.valid_until).toLocaleDateString("de-AT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(dc)}
                  disabled={loading !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                    dc.active
                      ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {dc.active ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => handleDelete(dc)}
                  disabled={loading !== null}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors disabled:opacity-50"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
