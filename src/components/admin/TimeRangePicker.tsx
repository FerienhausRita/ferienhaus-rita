"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "7 Tage", value: 7 },
  { label: "14 Tage", value: 14 },
  { label: "21 Tage", value: 21 },
  { label: "30 Tage", value: 30 },
  { label: "60 Tage", value: 60 },
];

export default function TimeRangePicker({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setDays = (days: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(days));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1 no-print">
      {PRESETS.map((p) => {
        const active = current === p.value;
        return (
          <button
            key={p.value}
            onClick={() => setDays(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              active
                ? "bg-[#c8a96e] text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
