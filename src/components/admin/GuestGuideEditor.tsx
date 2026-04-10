"use client";

import { useState } from "react";
import { updateSiteSetting } from "@/app/(admin)/admin/actions";

interface GuideItem {
  title: string;
  content: string;
}

interface GuideSection {
  title: string;
  icon: string;
  items: GuideItem[];
}

const ICON_OPTIONS = [
  { value: "home", label: "Haus" },
  { value: "map", label: "Region" },
  { value: "utensils", label: "Restaurants" },
  { value: "hiking", label: "Wandern" },
  { value: "activity", label: "Aktivitäten" },
  { value: "phone", label: "Notfall" },
];

export default function GuestGuideEditor({
  initialData,
}: {
  initialData: GuideSection[];
}) {
  const [sections, setSections] = useState<GuideSection[]>(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{ section: number; item: number } | null>(null);

  const save = async (updated: GuideSection[]) => {
    setSaving(true);
    setMessage(null);
    const result = await updateSiteSetting("guest_guide", updated);
    if (result.success) {
      setMessage({ type: "success", text: "Gespeichert" });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: "error", text: result.error || "Fehler beim Speichern" });
    }
    setSaving(false);
  };

  const addSection = () => {
    const updated = [...sections, { title: "Neue Kategorie", icon: "home", items: [] }];
    setSections(updated);
    setEditingSection(updated.length - 1);
  };

  const removeSection = (idx: number) => {
    if (!confirm(`Kategorie "${sections[idx].title}" wirklich löschen?`)) return;
    const updated = sections.filter((_, i) => i !== idx);
    setSections(updated);
    save(updated);
    setEditingSection(null);
  };

  const updateSection = (idx: number, field: keyof GuideSection, value: string) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: value };
    setSections(updated);
  };

  const moveSection = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setSections(updated);
    setEditingSection(target);
    save(updated);
  };

  const addItem = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: [...updated[sectionIdx].items, { title: "Neuer Eintrag", content: "" }],
    };
    setSections(updated);
    setEditingItem({ section: sectionIdx, item: updated[sectionIdx].items.length - 1 });
  };

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.filter((_, i) => i !== itemIdx),
    };
    setSections(updated);
    save(updated);
    setEditingItem(null);
  };

  const updateItem = (sectionIdx: number, itemIdx: number, field: keyof GuideItem, value: string) => {
    const updated = [...sections];
    const items = [...updated[sectionIdx].items];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    updated[sectionIdx] = { ...updated[sectionIdx], items };
    setSections(updated);
  };

  const moveItem = (sectionIdx: number, itemIdx: number, direction: -1 | 1) => {
    const target = itemIdx + direction;
    const items = sections[sectionIdx].items;
    if (target < 0 || target >= items.length) return;
    const updated = [...sections];
    const newItems = [...items];
    [newItems[itemIdx], newItems[target]] = [newItems[target], newItems[itemIdx]];
    updated[sectionIdx] = { ...updated[sectionIdx], items: newItems };
    setSections(updated);
    setEditingItem({ section: sectionIdx, item: target });
    save(updated);
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          className="bg-white rounded-xl border border-stone-200 overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 p-4 bg-stone-50 border-b border-stone-200">
            <div className="flex gap-1">
              <button
                onClick={() => moveSection(sIdx, -1)}
                disabled={sIdx === 0}
                className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                title="Nach oben"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                onClick={() => moveSection(sIdx, 1)}
                disabled={sIdx === sections.length - 1}
                className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                title="Nach unten"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setEditingSection(editingSection === sIdx ? null : sIdx)}
              className="flex-1 text-left font-semibold text-stone-800"
            >
              {section.title}
              <span className="ml-2 text-xs text-stone-400 font-normal">
                ({section.items.length} {section.items.length === 1 ? "Eintrag" : "Einträge"})
              </span>
            </button>

            <button
              onClick={() => removeSection(sIdx)}
              className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
              title="Kategorie löschen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>

          {/* Section edit form */}
          {editingSection === sIdx && (
            <div className="p-4 border-b border-stone-100 bg-stone-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Titel</label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                    onBlur={() => save(sections)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Icon</label>
                  <select
                    value={section.icon}
                    onChange={(e) => {
                      updateSection(sIdx, "icon", e.target.value);
                      save(sections.map((s, i) => i === sIdx ? { ...s, icon: e.target.value } : s));
                    }}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="divide-y divide-stone-100">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="p-4">
                {editingItem?.section === sIdx && editingItem?.item === iIdx ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(sIdx, iIdx, "title", e.target.value)}
                        placeholder="Titel"
                        className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e]"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveItem(sIdx, iIdx, -1)}
                          disabled={iIdx === 0}
                          className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveItem(sIdx, iIdx, 1)}
                          disabled={iIdx === section.items.length - 1}
                          className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={item.content}
                      onChange={(e) => updateItem(sIdx, iIdx, "content", e.target.value)}
                      placeholder="Inhalt (HTML erlaubt: <b>, <a href=...>, <br>)"
                      rows={4}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          save(sections);
                          setEditingItem(null);
                        }}
                        className="px-3 py-1.5 bg-[#c8a96e] text-white text-xs font-medium rounded-lg hover:bg-[#b8994e] transition-colors"
                      >
                        Fertig
                      </button>
                      <button
                        onClick={() => removeItem(sIdx, iIdx)}
                        className="px-3 py-1.5 text-red-500 text-xs font-medium hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingItem({ section: sIdx, item: iIdx })}
                    className="w-full text-left hover:bg-stone-50 -m-2 p-2 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-medium text-stone-800">{item.title}</p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {item.content ? item.content.replace(/<[^>]+>/g, "").slice(0, 80) : "Kein Inhalt"}
                      {item.content && item.content.length > 80 ? "..." : ""}
                    </p>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className="p-3 border-t border-stone-100">
            <button
              onClick={() => addItem(sIdx)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-stone-500 hover:text-[#c8a96e] hover:bg-[#c8a96e]/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Eintrag hinzufügen
            </button>
          </div>
        </div>
      ))}

      {/* Add section */}
      <button
        onClick={addSection}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:text-[#c8a96e] hover:border-[#c8a96e] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Neue Kategorie
      </button>

      {saving && (
        <p className="text-xs text-stone-400 text-center">Wird gespeichert...</p>
      )}
    </div>
  );
}
