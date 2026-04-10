"use client";

import { useEffect, useState, useCallback } from "react";

interface AvailabilityPreviewProps {
  apartmentId: string;
  apartmentSlug: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

const MONTH_NAMES = [
  "Januar", "Februar", "M\u00e4rz", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function AvailabilityPreview({ apartmentId, apartmentSlug }: AvailabilityPreviewProps) {
  const today = new Date();
  const [startMonth, setStartMonth] = useState(today.getMonth());
  const [startYear, setStartYear] = useState(today.getFullYear());
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const month2 = startMonth === 11 ? 0 : startMonth + 1;
  const year2 = startMonth === 11 ? startYear + 1 : startYear;

  const fetchDates = useCallback(async () => {
    setLoading(true);
    try {
      const m1 = `${startYear}-${String(startMonth + 1).padStart(2, "0")}`;
      const m2Str = `${year2}-${String(month2 + 1).padStart(2, "0")}`;

      const [r1, r2] = await Promise.all([
        fetch(`/api/availability?apartmentId=${apartmentId}&month=${m1}`),
        fetch(`/api/availability?apartmentId=${apartmentId}&month=${m2Str}`),
      ]);

      const d1 = await r1.json();
      const d2 = await r2.json();

      const dates = new Set<string>([
        ...(d1.unavailableDates || []),
        ...(d2.unavailableDates || []),
      ]);
      setUnavailable(dates);
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [apartmentId, startMonth, startYear, month2, year2]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  const canGoPrev = startYear > today.getFullYear() || startMonth > today.getMonth();

  const goNext = () => {
    if (startMonth === 11) {
      setStartMonth(0);
      setStartYear(startYear + 1);
    } else {
      setStartMonth(startMonth + 1);
    }
  };

  const goPrev = () => {
    if (!canGoPrev) return;
    if (startMonth === 0) {
      setStartMonth(11);
      setStartYear(startYear - 1);
    } else {
      setStartMonth(startMonth - 1);
    }
  };

  function renderMonth(year: number, month: number) {
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const todayStr = toISO(today);

    return (
      <div>
        <h4 className="text-sm font-semibold text-stone-800 text-center mb-2">
          {MONTH_NAMES[month]} {year}
        </h4>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-[10px] font-medium text-stone-400 py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isPast = dateStr < todayStr;
            const isUnavail = unavailable.has(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={day}
                className={`text-xs py-1.5 rounded ${
                  isPast
                    ? "text-stone-300"
                    : isUnavail
                    ? "bg-red-100 text-red-400 line-through"
                    : "text-stone-700"
                } ${isToday ? "font-bold ring-1 ring-stone-300 rounded" : ""}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900">Verf&uuml;gbarkeit</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="p-1 rounded hover:bg-stone-100 disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="p-1 rounded hover:bg-stone-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {renderMonth(startYear, startMonth)}
          {renderMonth(year2, month2)}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-[10px] text-stone-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100" />
          <span>Belegt</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-white border border-stone-200" />
          <span>Verf&uuml;gbar</span>
        </div>
      </div>

    </div>
  );
}
