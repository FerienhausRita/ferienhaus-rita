"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBlockedDate } from "@/app/(admin)/admin/actions";
import { useState, useRef, useCallback } from "react";

interface Booking {
  id: string;
  apartment_id: string;
  first_name: string;
  last_name: string;
  check_in: string;
  check_out: string;
  status: string;
  adults: number;
  children: number;
  dogs: number;
}

interface BlockedDate {
  id: string;
  apartment_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface CalendarViewProps {
  year: number;
  month: number;
  bookings: Booking[];
  blockedDates: BlockedDate[];
  apartments: { id: string; name: string }[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-400", text: "text-white" },
  confirmed: { bg: "bg-emerald-500", text: "text-white" },
  completed: { bg: "bg-stone-400", text: "text-white" },
};

const statusLabels: Record<string, string> = {
  pending: "Offen",
  confirmed: "Bestätigt",
  completed: "Abgeschlossen",
};

const monthNames = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function CalendarView({
  year,
  month,
  bookings,
  blockedDates,
  apartments,
}: CalendarViewProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Navigation
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const goToPrev = useCallback(() => {
    router.push(`/admin/kalender?year=${prevYear}&month=${prevMonth}`);
  }, [router, prevYear, prevMonth]);

  const goToNext = useCallback(() => {
    router.push(`/admin/kalender?year=${nextYear}&month=${nextMonth}`);
  }, [router, nextYear, nextMonth]);

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 60;
      if (diff > threshold) {
        goToPrev();
      } else if (diff < -threshold) {
        goToNext();
      }
      touchStartX.current = null;
    },
    [goToPrev, goToNext]
  );

  // Helpers
  const getDayOfWeek = (day: number) => {
    const date = new Date(year, month - 1, day);
    return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()];
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  const isToday = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === todayStr;
  };

  const formatDateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const monthStart = formatDateStr(year, month, 1);
  const monthEndExclusive = month === 12
    ? formatDateStr(year + 1, 1, 1)
    : formatDateStr(year, month + 1, 1);

  // Calculate bar position for a date range [start, end) within this month
  const calcBarPosition = (start: string, end: string) => {
    // Parse start/end dates
    const startParts = start.split("-").map(Number);
    const endParts = end.split("-").map(Number);

    // Clamp startDay: if booking starts before this month, use day 1
    let startDay: number;
    if (start < monthStart) {
      startDay = 1;
    } else {
      startDay = startParts[2];
    }

    // Clamp endDay: end is exclusive (checkout day), so last occupied day = end - 1
    // If end is after this month, last occupied day is last day of month
    let endDay: number;
    if (end >= monthEndExclusive) {
      endDay = daysInMonth;
    } else {
      // end date day minus 1 (exclusive)
      endDay = endParts[2] - 1;
    }

    // If endDay < startDay, booking doesn't actually cover any days this month
    if (endDay < startDay) return null;

    const leftPercent = ((startDay - 1) / daysInMonth) * 100;
    const widthPercent = ((endDay - startDay + 1) / daysInMonth) * 100;

    return { leftPercent, widthPercent, startDay, endDay };
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Sperrung wirklich aufheben?")) return;
    setDeletingId(id);
    await deleteBlockedDate(id);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Monatsnavigation – Swipe hier für Monatswechsel */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-stone-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={goToPrev}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Vorheriger Monat"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-bold text-stone-900 text-lg">
            {monthNames[month - 1]} {year}
          </h2>
        </div>
        <button
          onClick={goToNext}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Nächster Monat"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-4 px-5 py-3 border-b border-stone-100 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-400" />
          <span className="text-stone-600">Offen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-stone-600">Bestätigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-stone-400" />
          <span className="text-stone-600">Abgeschlossen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-300 bg-stripes" />
          <span className="text-stone-600">Gesperrt</span>
        </div>
      </div>

      {/* Kalender-Raster */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Tages-Header */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${daysInMonth}, 1fr)` }}
          >
            <div className="px-3 py-2 border-b border-r border-stone-100 bg-stone-50 text-xs font-medium text-stone-500 sticky left-0 z-10">
              Wohnung
            </div>
            {days.map((day) => (
              <div
                key={day}
                className={`px-0.5 py-1.5 border-b border-r border-stone-100 text-center text-[10px] leading-tight ${
                  isToday(day)
                    ? "bg-[#c8a96e]/10 font-bold text-[#c8a96e]"
                    : isWeekend(day)
                    ? "bg-stone-50 text-stone-400"
                    : "text-stone-500"
                }`}
              >
                <div className="font-medium">{getDayOfWeek(day)}</div>
                <div>{day}</div>
              </div>
            ))}
          </div>

          {/* Wohnungszeilen */}
          {apartments.map((apt) => {
            const aptBookings = bookings.filter(
              (b) => b.apartment_id === apt.id
            );
            const aptBlocked = blockedDates.filter(
              (b) => b.apartment_id === apt.id
            );

            return (
              <div key={apt.id} className="grid" style={{ gridTemplateColumns: `140px 1fr` }}>
                {/* Wohnungsname */}
                <div className="px-3 py-3 border-b border-r border-stone-100 bg-stone-50 flex items-center sticky left-0 z-10">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {apt.name}
                  </p>
                </div>

                {/* Tagesraster + Buchungsbalken */}
                <div className="relative border-b border-stone-100" style={{ height: 48 }}>
                  {/* Hintergrund-Gitterzellen */}
                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}
                  >
                    {days.map((day) => (
                      <div
                        key={day}
                        className={`border-r border-stone-100 ${
                          isToday(day)
                            ? "bg-[#c8a96e]/5"
                            : isWeekend(day)
                            ? "bg-stone-50/50"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  {/* Gesperrte Zeiträume */}
                  {aptBlocked.map((block) => {
                    const pos = calcBarPosition(block.start_date, block.end_date);
                    if (!pos) return null;

                    return (
                      <button
                        key={block.id}
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={deletingId === block.id}
                        className="absolute top-1 bottom-1 rounded bg-red-200 bg-stripes opacity-70 hover:opacity-90 transition-opacity flex items-center px-1.5 overflow-hidden z-10 cursor-pointer"
                        style={{
                          left: `${pos.leftPercent}%`,
                          width: `${pos.widthPercent}%`,
                        }}
                        title={`${block.reason || "Gesperrt"} — Klicken zum Aufheben`}
                      >
                        <span className="text-red-800 text-[10px] font-medium truncate">
                          {block.reason?.replace("iCal: ", "") ?? "Gesperrt"}
                        </span>
                      </button>
                    );
                  })}

                  {/* Buchungsbalken */}
                  {aptBookings.map((booking) => {
                    const pos = calcBarPosition(booking.check_in, booking.check_out);
                    if (!pos) return null;

                    const colors = statusColors[booking.status] ?? {
                      bg: "bg-stone-300",
                      text: "text-white",
                    };
                    const label = `${booking.first_name} ${booking.last_name} · #${booking.id.slice(0, 4).toUpperCase()}`;
                    const tooltip = [
                      `${booking.first_name} ${booking.last_name}`,
                      `#${booking.id.slice(0, 4).toUpperCase()}`,
                      `${booking.check_in} — ${booking.check_out}`,
                      `Status: ${statusLabels[booking.status] ?? booking.status}`,
                      `${booking.adults} Erw.${booking.children ? `, ${booking.children} Kind${booking.children > 1 ? "er" : ""}` : ""}${booking.dogs ? `, ${booking.dogs} Hund${booking.dogs > 1 ? "e" : ""}` : ""}`,
                    ].join("\n");

                    return (
                      <Link
                        key={booking.id}
                        href={`/admin/buchungen/${booking.id}`}
                        className={`absolute top-1 bottom-1 rounded ${colors.bg} opacity-85 hover:opacity-100 transition-opacity flex items-center px-1.5 overflow-hidden z-20 shadow-sm`}
                        style={{
                          left: `${pos.leftPercent}%`,
                          width: `${pos.widthPercent}%`,
                        }}
                        title={tooltip}
                      >
                        <span className={`${colors.text} text-[10px] font-medium truncate`}>
                          {label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
