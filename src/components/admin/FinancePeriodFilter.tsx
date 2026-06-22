"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function FinancePeriodFilter({
  year,
  month,
  years,
}: {
  year: number;
  month: number | null;
  years: number[];
}) {
  const router = useRouter();

  const go = (y: number, m: number | null) => {
    const params = new URLSearchParams();
    params.set("year", String(y));
    if (m) params.set("month", String(m));
    router.push(`/admin/finanzen?${params.toString()}`);
  };

  const selectClass =
    "px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={month ?? ""}
        onChange={(e) => go(year, e.target.value ? Number(e.target.value) : null)}
        className={selectClass}
      >
        <option value="">Ganzes Jahr</option>
        {MONTHS.map((label, i) => (
          <option key={i} value={i + 1}>{label}</option>
        ))}
      </select>
    </div>
  );
}
