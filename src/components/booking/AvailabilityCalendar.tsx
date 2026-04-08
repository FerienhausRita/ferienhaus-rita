"use client";

import { useState, useCallback, useEffect } from "react";
import {
  toISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  DAY_NAMES,
  MONTH_NAMES,
} from "@/lib/calendar-utils";

interface AvailabilityCalendarProps {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  onSelectRange: (checkIn: string, checkOut: string) => void;
}

export default function AvailabilityCalendar({
  apartmentId,
  checkIn,
  checkOut,
  onSelectRange,
}: AvailabilityCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<"checkIn" | "checkOut">(
    checkIn ? "checkOut" : "checkIn"
  );

  // Compute the second month
  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const fetchUnavailable = useCallback(async () => {
    if (!apartmentId) return;
    setLoading(true);
    try {
      const monthStr1 = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
      const monthStr2 = `${secondYear}-${String(secondMonth + 1).padStart(2, "0")}`;
      const [res1, res2] = await Promise.all([
        fetch(`/api/availability?apartmentId=${apartmentId}&month=${monthStr1}`),
        fetch(`/api/availability?apartmentId=${apartmentId}&month=${monthStr2}`),
      ]);
      const dates = new Set<string>();
      if (res1.ok) {
        const data = await res1.json();
        (data.unavailableDates || []).forEach((d: string) => dates.add(d));
      }
      if (res2.ok) {
        const data = await res2.json();
        (data.unavailableDates || []).forEach((d: string) => dates.add(d));
      }
      setUnavailableDates(dates);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [apartmentId, viewYear, viewMonth, secondYear, secondMonth]);

  useEffect(() => {
    fetchUnavailable();
  }, [fetchUnavailable]);

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function goPrevMonth() {
    const isCurrentMonth =
      viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrentMonth) return;

    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function handleDayClick(dateStr: string) {
    if (unavailableDates.has(dateStr)) return;

    const clickedDate = new Date(dateStr);
    if (clickedDate < today) return;

    if (selecting === "checkIn") {
      onSelectRange(dateStr, "");
      setSelecting("checkOut");
    } else {
      if (checkIn && dateStr > checkIn) {
        onSelectRange(checkIn, dateStr);
        setSelecting("checkIn");
      } else {
        onSelectRange(dateStr, "");
        setSelecting("checkOut");
      }
    }
  }

  const isPrevDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function renderMonth(year: number, month: number) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfWeek(year, month);
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    return (
      <div>
        <h4 className="text-xs sm:text-sm font-semibold text-stone-800 text-center mb-2">
          {monthLabel}
        </h4>

        <div className="grid grid-cols-7 mb-0.5">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-stone-400 py-0.5">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7 sm:h-8" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const dateStr = toISODate(date);
            const isPast = date < today;
            const isUnavailable = unavailableDates.has(dateStr);
            const isDisabled = isPast || isUnavailable;

            const isCheckIn = dateStr === checkIn;
            const isCheckOut = dateStr === checkOut;
            const isInRange =
              checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

            let cellClasses =
              "h-7 sm:h-8 flex items-center justify-center text-[11px] sm:text-xs rounded transition-all";

            if (isPast) {
              cellClasses += " text-stone-300 cursor-not-allowed";
            } else if (isCheckIn) {
              cellClasses += " bg-alpine-600 text-white font-bold rounded-r-none";
            } else if (isCheckOut) {
              cellClasses += " bg-alpine-600 text-white font-bold rounded-l-none";
            } else if (isInRange) {
              cellClasses += " bg-alpine-100 text-alpine-800 rounded-none";
            } else if (isUnavailable) {
              cellClasses += " bg-red-50 text-red-300 cursor-not-allowed line-through";
            } else {
              cellClasses += " bg-emerald-50 text-stone-700 cursor-pointer hover:ring-2 hover:ring-alpine-400";
            }

            return (
              <button
                key={day}
                onClick={() => !isDisabled && handleDayClick(dateStr)}
                disabled={isDisabled}
                className={cellClasses}
                title={isUnavailable ? "Belegt" : "Verfügbar"}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* Instruction */}
      <div className="bg-alpine-50 rounded-lg px-3 py-2 mb-4 text-xs text-alpine-700">
        {selecting === "checkIn"
          ? "→ Klicken Sie auf Ihr gewünschtes Anreisedatum"
          : "→ Klicken Sie jetzt auf Ihr Abreisedatum"}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goPrevMonth}
          disabled={isPrevDisabled}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Vorheriger Monat"
        >
          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {loading && (
          <span className="inline-block w-3 h-3 border-2 border-stone-300 border-t-alpine-500 rounded-full animate-spin" />
        )}
        <button
          onClick={goNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Nächster Monat"
        >
          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Two-month grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {renderMonth(viewYear, viewMonth)}
        {renderMonth(secondYear, secondMonth)}
      </div>

      {/* Compact legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] sm:text-xs text-stone-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
          Verfügbar
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200 line-through text-[7px] leading-none flex items-center justify-center text-red-300">x</span>
          Belegt
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-alpine-600" />
          Ihre Auswahl
        </div>
      </div>
    </div>
  );
}
