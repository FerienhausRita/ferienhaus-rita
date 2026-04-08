"use client";

import { useState, useCallback, useEffect } from "react";
import { getSeasonForDate, seasonConfigs, SeasonType } from "@/data/seasons";

interface AvailabilityCalendarProps {
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  onSelectRange: (checkIn: string, checkOut: string) => void;
}

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const SEASON_COLORS: Record<SeasonType, string> = {
  high: "bg-amber-50",
  mid: "bg-white",
  low: "bg-emerald-50",
};

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
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

  const fetchUnavailable = useCallback(async () => {
    if (!apartmentId) return;
    setLoading(true);
    try {
      const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
      const res = await fetch(
        `/api/availability?apartmentId=${apartmentId}&month=${monthStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setUnavailableDates(new Set(data.unavailableDates || []));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [apartmentId, viewYear, viewMonth]);

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

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("de-AT", {
    month: "long",
    year: "numeric",
  });

  const isPrevDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
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
        <h3 className="text-sm font-semibold text-stone-800 capitalize">
          {monthLabel}
          {loading && (
            <span className="ml-2 inline-block w-3 h-3 border-2 border-stone-300 border-t-alpine-500 rounded-full animate-spin" />
          )}
        </h3>
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

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const dateStr = toISODate(date);
          const isPast = date < today;
          const isUnavailable = unavailableDates.has(dateStr);
          const isDisabled = isPast || isUnavailable;

          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const isInRange =
            checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

          const season = getSeasonForDate(date);
          const seasonBg =
            !isDisabled && !isCheckIn && !isCheckOut && !isInRange
              ? SEASON_COLORS[season.type]
              : "";

          return (
            <button
              key={day}
              onClick={() => !isDisabled && handleDayClick(dateStr)}
              disabled={isDisabled}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-lg transition-all
                ${isDisabled ? "text-stone-300 cursor-not-allowed line-through" : "cursor-pointer hover:ring-2 hover:ring-alpine-400"}
                ${isCheckIn ? "bg-alpine-600 text-white font-bold rounded-r-none" : ""}
                ${isCheckOut ? "bg-alpine-600 text-white font-bold rounded-l-none" : ""}
                ${isInRange ? "bg-alpine-100 text-alpine-800 rounded-none" : ""}
                ${!isCheckIn && !isCheckOut && !isInRange && !isDisabled ? seasonBg : ""}
                ${isUnavailable && !isPast ? "bg-stone-100" : ""}
              `}
              title={
                isUnavailable
                  ? "Nicht verfügbar"
                  : `${season.label} – ${seasonConfigs[season.type].multiplier}×`
              }
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-50 border border-stone-200" />
          Hochsaison
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-stone-200" />
          Zwischensaison
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-stone-200" />
          Nebensaison
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-100 border border-stone-200 line-through text-[8px] leading-none flex items-center justify-center">
            x
          </span>
          Belegt
        </div>
      </div>

      <p className="mt-3 text-xs text-stone-400">
        {selecting === "checkIn"
          ? "Anreisedatum wählen"
          : "Abreisedatum wählen"}
      </p>
    </div>
  );
}
