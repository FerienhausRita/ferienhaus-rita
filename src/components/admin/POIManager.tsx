"use client";

import { useState } from "react";

interface POI {
  id: string;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  website: string | null;
  is_featured: boolean;
  active: boolean;
}

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hiking", label: "Wandern" },
  { value: "activity", label: "Aktivität" },
  { value: "viewpoint", label: "Aussichtspunkt" },
  { value: "shopping", label: "Einkaufen" },
  { value: "emergency", label: "Notfall" },
  { value: "ski", label: "Skigebiet" },
  { value: "accommodation", label: "Unterkunft" },
];

const EMPTY_POI: Omit<POI, "id"> = {
  name: "",
  description: "",
  category: "activity",
  lat: 47.0045,
  lng: 12.6432,
  address: "",
  website: "",
  is_featured: false,
  active: true,
};

export default function POIManager({ initialPois }: { initialPois: POI[] }) {
  const [pois, setPois] = useState<POI[]>(initialPois);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<POI, "id">>(EMPTY_POI);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const savePOI = async () => {
    setLoading(true);
    try {
      const url = editing ? `/api/admin/pois/${editing}` : "/api/admin/pois";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editing) {
        setPois((prev) => prev.map((p) => (p.id === editing ? data : p)));
      } else {
        setPois((prev) => [...prev, data]);
      }
      setEditing(null);
      setCreating(false);
      setForm(EMPTY_POI);
      showMessage("success", editing ? "Gespeichert" : "Erstellt");
    } catch (err: any) {
      showMessage("error", err.message || "Fehler");
    }
    setLoading(false);
  };

  const deletePOI = async (id: string) => {
    if (!confirm("Diesen Ort wirklich löschen?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pois/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setPois((prev) => prev.filter((p) => p.id !== id));
      showMessage("success", "Gelöscht");
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setLoading(false);
  };

  const startEdit = (poi: POI) => {
    setEditing(poi.id);
    setCreating(false);
    setForm({
      name: poi.name,
      description: poi.description || "",
      category: poi.category,
      lat: poi.lat,
      lng: poi.lng,
      address: poi.address || "",
      website: poi.website || "",
      is_featured: poi.is_featured,
      active: poi.active,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(EMPTY_POI);
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(EMPTY_POI);
  };

  const renderForm = () => (
    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Kategorie</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Beschreibung</label>
        <textarea
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Breitengrad (Lat)</label>
          <input
            type="number"
            step="0.0001"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Längengrad (Lng)</label>
          <input
            type="number"
            step="0.0001"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Adresse</label>
          <input
            type="text"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Website</label>
          <input
            type="url"
            value={form.website || ""}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            className="rounded"
          />
          Hervorgehoben
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded"
          />
          Aktiv
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={savePOI}
          disabled={loading || !form.name}
          className="px-4 py-2 bg-[#c8a96e] text-white text-sm font-medium rounded-lg hover:bg-[#b8994e] disabled:opacity-50 transition-colors"
        >
          {loading ? "Speichern..." : editing ? "Speichern" : "Erstellen"}
        </button>
        <button
          onClick={cancel}
          className="px-4 py-2 text-stone-500 text-sm hover:bg-stone-100 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {creating && renderForm()}

      {/* POI list */}
      <div className="space-y-2">
        {pois.map((poi) => (
          <div key={poi.id}>
            {editing === poi.id ? (
              renderForm()
            ) : (
              <div className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                  poi.active ? "bg-green-100 text-green-600" : "bg-stone-100 text-stone-400"
                }`}>
                  {CATEGORIES.find((c) => c.value === poi.category)?.label.slice(0, 2) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {poi.name}
                    {poi.is_featured && <span className="ml-1.5 text-[#c8a96e]">★</span>}
                  </p>
                  <p className="text-xs text-stone-400">
                    {CATEGORIES.find((c) => c.value === poi.category)?.label} · {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(poi)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deletePOI(poi.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!creating && (
        <button
          onClick={startCreate}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:text-[#c8a96e] hover:border-[#c8a96e] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neuer Ort
        </button>
      )}
    </div>
  );
}
