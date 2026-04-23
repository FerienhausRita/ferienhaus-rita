"use client";

import { useEffect, useRef, useState } from "react";

export interface AddressSuggestion {
  display: string;
  street: string;
  zip: string;
  city: string;
  country: string;
}

interface NominatimResult {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
}

/**
 * Hook for address autocomplete via OpenStreetMap Nominatim.
 * - Free, no API key required
 * - Debounced to respect Nominatim's 1-req/sec policy
 * - Limited to AT + DE by default (extend via countryCodes param)
 *
 * Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */
export function useAddressSuggestions(
  query: string,
  options?: { countryCodes?: string; debounceMs?: number; minLength?: number }
) {
  const countryCodes = options?.countryCodes ?? "at,de";
  const debounceMs = options?.debounceMs ?? 400;
  const minLength = options?.minLength ?? 3;

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", countryCodes);
        url.searchParams.set("q", trimmed);

        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          setSuggestions([]);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as NominatimResult[];
        const parsed = data
          .map((item) => {
            const a = item.address ?? {};
            const road = a.road ?? "";
            const houseNumber = a.house_number ?? "";
            const street = [road, houseNumber].filter(Boolean).join(" ").trim();
            const city = a.city ?? a.town ?? a.village ?? "";
            const zip = a.postcode ?? "";
            const country = a.country ?? "";
            if (!street || !city) return null;
            return {
              display: item.display_name ?? `${street}, ${zip} ${city}`,
              street,
              zip,
              city,
              country,
            } as AddressSuggestion;
          })
          .filter((x): x is AddressSuggestion => x !== null);

        setSuggestions(parsed);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("useAddressSuggestions error:", err);
        }
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, countryCodes, debounceMs, minLength]);

  return { suggestions, loading };
}
