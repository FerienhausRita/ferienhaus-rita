"use client";

import { useState, useRef, useEffect } from "react";
import {
  useAddressSuggestions,
  type AddressSuggestion,
} from "@/hooks/useAddressSuggestions";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressSuggestion) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

/**
 * Street-autocomplete via Nominatim. Picking a suggestion fills the
 * connected zip/city fields in the parent form through `onSelect`.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  required,
  placeholder,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { suggestions, loading } = useAddressSuggestions(value, {
    minLength: 3,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Open on new query, reset highlight
  useEffect(() => {
    if (value.length >= 3) {
      setOpen(true);
      setHighlight(0);
    } else {
      setOpen(false);
    }
  }, [value]);

  const pick = (s: AddressSuggestion) => {
    onSelect(s);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const inputClasses =
    "w-full h-[46px] px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)] transition-all";

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-stone-700 mb-1">
        Straße & Hausnummer{required && " *"}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.length >= 3 && setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? "Musterstraße 12"}
        className={`${inputClasses} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : ""}`}
        autoComplete="street-address"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-stone-400">Suche...</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={`${s.street}-${s.zip}-${i}`}
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === highlight
                    ? "bg-[var(--color-gold)]/10 text-stone-900"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="font-medium">{s.street}</div>
                <div className="text-xs text-stone-500 truncate">
                  {s.zip} {s.city}
                  {s.country ? ` · ${s.country}` : ""}
                </div>
              </button>
            ))
          )}
          <div className="px-3 py-1.5 text-[10px] text-stone-400 bg-stone-50 border-t border-stone-100">
            Adressvorschläge via OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
