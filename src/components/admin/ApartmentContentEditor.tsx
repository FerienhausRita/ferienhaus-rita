"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateApartmentContent,
  deleteApartmentContent,
} from "@/app/(admin)/admin/actions";

interface AmenityGroup {
  category: string;
  items: string[];
}

export interface ApartmentContentData {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  floor: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  baseGuests: number;
  available: boolean;
  features: string[];
  highlights: string[];
  amenities: AmenityGroup[];
}

const inputClass =
  "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";
const labelClass = "block text-xs font-medium text-stone-600 mb-1";

function StatusMessage({
  status,
}: {
  status: { type: "success" | "error"; message: string } | null;
}) {
  if (!status) return null;
  return (
    <p className={`text-xs ${status.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
      {status.message}
    </p>
  );
}

// ─── Liste von Strings (Features / Highlights / Ausstattungs-Punkte) ───
function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Eintrag entfernen"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-sm text-[#c8a96e] hover:text-[#b8985d] font-medium"
      >
        + Eintrag hinzufügen
      </button>
    </div>
  );
}

// ─── Ausstattungs-Gruppen (Kategorie + Punkte) ───
function AmenitiesEditor({
  groups,
  onChange,
}: {
  groups: AmenityGroup[];
  onChange: (next: AmenityGroup[]) => void;
}) {
  const update = (i: number, patch: Partial<AmenityGroup>) => {
    const next = [...groups];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {groups.map((group, i) => (
        <div key={i} className="p-3 border border-stone-200 rounded-xl bg-stone-50/50">
          <div className="flex gap-2 mb-3">
            <input
              value={group.category}
              placeholder="Kategorie (z.B. Wohnen)"
              onChange={(e) => update(i, { category: e.target.value })}
              className={`${inputClass} font-medium`}
            />
            <button
              type="button"
              onClick={() => onChange(groups.filter((_, j) => j !== i))}
              aria-label="Gruppe entfernen"
              className="flex-shrink-0 px-3 h-9 flex items-center justify-center rounded-xl text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Gruppe löschen
            </button>
          </div>
          <StringListEditor
            items={group.items}
            placeholder="Ausstattungs-Punkt"
            onChange={(items) => update(i, { items })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...groups, { category: "", items: [] }])}
        className="text-sm text-[#c8a96e] hover:text-[#b8985d] font-medium"
      >
        + Ausstattungs-Gruppe hinzufügen
      </button>
    </div>
  );
}

function ApartmentCard({ apt }: { apt: ApartmentContentData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: apt.name,
    subtitle: apt.subtitle,
    description: apt.description,
    shortDescription: apt.shortDescription,
    floor: apt.floor,
    size: apt.size,
    bedrooms: apt.bedrooms,
    bathrooms: apt.bathrooms,
    maxGuests: apt.maxGuests,
    baseGuests: apt.baseGuests,
    available: apt.available,
    features: apt.features,
    highlights: apt.highlights,
    amenities: apt.amenities,
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const res = await updateApartmentContent(apt.id, {
      name: form.name.trim() || null,
      subtitle: form.subtitle,
      description: form.description,
      shortDescription: form.shortDescription,
      floor: form.floor,
      size: form.size,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      maxGuests: form.maxGuests,
      baseGuests: form.baseGuests,
      available: form.available,
      features: form.features.map((s) => s.trim()).filter(Boolean),
      highlights: form.highlights.map((s) => s.trim()).filter(Boolean),
      amenities: form.amenities
        .map((g) => ({ category: g.category.trim(), items: g.items.map((s) => s.trim()).filter(Boolean) }))
        .filter((g) => g.category || g.items.length > 0),
    });
    setStatus(
      res.success
        ? { type: "success", message: "Gespeichert" }
        : { type: "error", message: res.error ?? "Fehler beim Speichern" }
    );
    setSaving(false);
    if (res.success) router.refresh();
    setTimeout(() => setStatus(null), 3000);
  };

  const handleReset = async () => {
    if (!confirm(`„${apt.name}" auf die Standard-Inhalte zurücksetzen? Deine Änderungen für diese Wohnung gehen verloren.`))
      return;
    setResetting(true);
    setStatus(null);
    const res = await deleteApartmentContent(apt.id);
    setResetting(false);
    if (res.success) {
      router.refresh();
    } else {
      setStatus({ type: "error", message: res.error ?? "Fehler" });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-semibold text-stone-900">{form.name || apt.name}</span>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-6 pt-1 space-y-5 border-t border-stone-100">
          {/* Texte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Untertitel</label>
              <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kurzbeschreibung (für Listen & Suchmaschinen)</label>
            <textarea
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Eckdaten */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Fläche (m²)</label>
              <input type="number" value={form.size} onChange={(e) => set("size", num(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Schlafzimmer</label>
              <input type="number" value={form.bedrooms} onChange={(e) => set("bedrooms", num(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bäder</label>
              <input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", num(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max. Gäste</label>
              <input type="number" value={form.maxGuests} onChange={(e) => set("maxGuests", num(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Grundpreis-Gäste</label>
              <input type="number" value={form.baseGuests} onChange={(e) => set("baseGuests", num(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Stockwerk</label>
              <input value={form.floor} onChange={(e) => set("floor", e.target.value)} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => set("available", e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]/50"
            />
            Wohnung buchbar / sichtbar
          </label>

          {/* Features */}
          <div>
            <label className={labelClass}>Features (Häkchen-Liste in der Seitenleiste)</label>
            <StringListEditor items={form.features} placeholder="z.B. Bergpanorama" onChange={(v) => set("features", v)} />
          </div>

          {/* Highlights */}
          <div>
            <label className={labelClass}>Highlights (Übersichts-Karten)</label>
            <StringListEditor items={form.highlights} placeholder="z.B. 96 m² Wohnfläche" onChange={(v) => set("highlights", v)} />
          </div>

          {/* Amenities */}
          <div>
            <label className={labelClass}>Ausstattung (Gruppen)</label>
            <AmenitiesEditor groups={form.amenities} onChange={(v) => set("amenities", v)} />
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="text-sm text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
            >
              {resetting ? "Setzt zurück…" : "Auf Standard zurücksetzen"}
            </button>
            <StatusMessage status={status} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApartmentContentEditor({
  apartments,
}: {
  apartments: ApartmentContentData[];
}) {
  return (
    <div className="space-y-4">
      {apartments.map((apt) => (
        <ApartmentCard key={apt.id} apt={apt} />
      ))}
    </div>
  );
}
