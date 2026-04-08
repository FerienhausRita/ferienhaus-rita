"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

const filters = [
  { key: undefined, label: "Alle" },
  { key: "pending", label: "Offen" },
  { key: "upcoming", label: "Anstehend" },
  { key: "current", label: "Aktuell" },
  { key: "past", label: "Vergangen" },
  { key: "cancelled", label: "Storniert" },
];

interface BookingFiltersProps {
  currentFilter?: string;
  currentSearch?: string;
}

export default function BookingFilters({
  currentFilter,
  currentSearch,
}: BookingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch ?? "");

  const updateParams = useCallback(
    (filter?: string, searchValue?: string) => {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (searchValue?.trim()) params.set("search", searchValue.trim());
      const queryString = params.toString();
      router.push(`/admin/buchungen${queryString ? `?${queryString}` : ""}`);
    },
    [router]
  );

  const handleFilterClick = (filterKey?: string) => {
    updateParams(filterKey, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams(currentFilter, search);
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <button
            key={f.key ?? "all"}
            onClick={() => handleFilterClick(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              currentFilter === f.key ||
              (!currentFilter && f.key === undefined)
                ? "bg-[#c8a96e] text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, E-Mail oder Buchungs-ID suchen..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50"
        />
      </form>
    </div>
  );
}
