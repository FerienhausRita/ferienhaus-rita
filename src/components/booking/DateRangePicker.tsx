"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  toISODate,
  getDaysInMonth,
  getFirstDayOfWeek,
  DAY_NAMES,
  MONTH_NAMES,
  formatDateGerman,
} from "@/lib/calendar-utils";

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
}: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selecting, setSelecting] = useState<"checkIn" | "checkOut">(
    checkIn ? "checkOut" : "checkIn"
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      const nowYear = today.getFullYear();
      const nowMonth = today.getMonth();
      if (m === 0) {
        const prevYear = viewYear - 1;
        if (prevYear < nowYear || (prevYear === nowYear && 11 < nowMonth)) {
          return m;
        }
        setViewYear(prevYear);
        return 11;
      }
      const prevMonth = m - 1;
      if (viewYear === nowYear && prevMonth < nowMonth) {
        return m;
      }
      return prevMonth;
    });
  }, [viewYear, today]);

  const isPrevDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function handleDayClick(dateStr: string) {
    if (selecting === "checkIn") {
      onChange(dateStr, "");
      setSelecting("checkOut");
    } else {
      if (checkIn && dateStr > checkIn) {
        onChange(checkIn, dateStr);
        setSelecting("checkIn");
        // Auto-close after both dates selected
        setTimeout(() => setIsOpen(false), 300);
      } else {
        // Clicked before check-in, reset
        onChange(dateStr, "");
        setSelecting("checkOut");
      }
    }
  }

  function handleOpen() {
    setIsOpen(true);
    if (!checkIn) {
      setSelecting("checkIn");
    } else if (!checkOut) {
      setSelecting("checkOut");
    } else {
      setSelecting("checkIn");
    }
  }

  function renderMonth(year: number, month: number) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfWeek(year, month);
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    return (
      <div>
        <h3 className="text-sm font-semibold text-stone-800 text-center mb-2">
          {monthLabel}
        </h3>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="h-8 flex items-center justify-center text-xs font-medium text-stone-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const dateStr = toISODate(date);
            const isPast = date < today;
            const isDisabled = isPast;

            const isCheckIn = dateStr === checkIn;
            const isCheckOut = dateStr === checkOut;
            const isInRange =
              checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

            // Hover preview
            const isHoverPreview =
              !isDisabled &&
              !isCheckIn &&
              !isCheckOut &&
              !isInRange &&
              checkIn &&
              !checkOut &&
              selecting === "checkOut" &&
              hoveredDate &&
              hoveredDate > checkIn &&
              dateStr > checkIn &&
              dateStr <= hoveredDate;

            let cellClasses =
              "h-9 flex items-center justify-center text-sm transition-colors";

            if (isDisabled) {
              cellClasses += " text-stone-300 cursor-not-allowed";
            } else if (isCheckIn) {
              cellClasses +=
                " bg-alpine-600 text-white font-semibold rounded-l-lg";
            } else if (isCheckOut) {
              cellClasses +=
                " bg-alpine-600 text-white font-semibold rounded-r-lg";
            } else if (isInRange) {
              cellClasses += " bg-alpine-100 text-alpine-800";
            } else if (isHoverPreview) {
              cellClasses += " bg-alpine-50";
            } else {
              cellClasses +=
                " cursor-pointer hover:bg-stone-100 text-stone-700 rounded-lg";
            }

            return (
              <button
                key={day}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && handleDayClick(dateStr)}
                onMouseEnter={() => !isDisabled && setHoveredDate(dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cellClasses}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Compute second month
  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger bar */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex items-center text-left transition-all hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-alpine-400/40 focus:border-alpine-400"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-stone-500">Anreise</div>
          <div
            className={`text-sm mt-0.5 ${checkIn ? "text-stone-800 font-medium" : "text-stone-400"}`}
          >
            {checkIn ? formatDateGerman(checkIn) : "Datum wählen"}
          </div>
        </div>

        <div className="w-px h-8 bg-stone-200 mx-3" />

        <div className="flex-1 min-w-0">
          <div className="text-xs text-stone-500">Abreise</div>
          <div
            className={`text-sm mt-0.5 ${checkOut ? "text-stone-800 font-medium" : "text-stone-400"}`}
          >
            {checkOut ? formatDateGerman(checkOut) : "Datum wählen"}
          </div>
        </div>

        {/* Calendar icon */}
        <svg
          className="w-5 h-5 text-stone-400 ml-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 sm:p-6 mt-2 w-[320px] sm:w-[600px]">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={isPrevDisabled}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Vorheriger Monat"
            >
              <svg
                className="w-4 h-4 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-sm font-medium text-alpine-700 bg-alpine-50 px-3 py-1 rounded-full">
              {selecting === "checkIn"
                ? "→ Anreisedatum wählen"
                : "→ Abreisedatum wählen"}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Nächster Monat"
            >
              <svg
                className="w-4 h-4 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Calendars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {renderMonth(viewYear, viewMonth)}
            <div className="hidden sm:block">
              {renderMonth(secondYear, secondMonth)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
