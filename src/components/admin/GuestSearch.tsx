"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface GuestSearchProps {
  currentSearch?: string;
}

export default function GuestSearch({ currentSearch }: GuestSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const queryString = params.toString();
    router.push(`/admin/gaeste${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
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
        placeholder="Name oder E-Mail suchen..."
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 focus:border-[#c8a96e]/50"
      />
    </form>
  );
}
