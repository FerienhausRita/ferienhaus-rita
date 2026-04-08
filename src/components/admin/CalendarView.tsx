"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBlockedDate } from "@/app/(admin)/admin/actions";
import { useState, useRef, useEffect, useCallback } from "react";

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
  currentMonth: number;
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
  currentMonth,
  bookings,
  blockedDates,
  apartments,
}: CalendarViewProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Scroll to current month on mount
  useEffect(() => {
    const el = monthRefs.current[currentMonth - 1];
    if (el && scrollRef.current) {
      // Small delay so layout is ready
      requestAnimationFrame(() => {
        el.scrollIntoView({ inline: "start", behavior: "instant" });
      });
    }
  }, [currentMonth]);

  // Year navigation
  const goToPrevYear = useCallback(() => {
    router.push(`/admin/kalender?year=${year - 1}`);
  }, [router, year]);

  const goToNextYear = useCallback(() => {
    router.push(`/admin/kalender?year=${year + 1}`);
  }, [router, year]);

  const scrollToMonth = useCallback((monthIndex: number) => {
    const el = monthRefs.current[monthIndex];
    if (el) {
      el.scrollIntoView({ inline: "start", behavior: "smooth" });
    }
  }, []);

  // Helpers
  const getDayOfWeek = (y: number, m: number, day: number) => {
    const date = new Date(y, m - 1, day);
    return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()];
  };

  const isWeekend = (y: number, m: number, day: number) => {
    const date = new Date(y, m - 1, day);
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  const isTodayFn = (y: number, m: number, day: number) => {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === todayStr;
  };

  const formatDateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Sperrung wirklich aufheben?")) return;
    setDeletingId(id);
    await deleteBlockedDate(id);
    setDeletingId(null);
    router.refresh();
  };

  // Render a single month for an apartment
  const renderMonthForApartment = (
    apt: { id: string; name: string },
    month: number
  ) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthStart = formatDateStr(year, month, 1);
    const monthEndExclusive =
      month === 12 ? formatDateStr(year + 1, 1, 1) : formatDateStr(year, month + 1, 1);

    const calcBarPosition = (start: string, end: string) => {
      let startDay: number;
      if (start < monthStart) {
        startDay = 1;
      } else {
        startDay = parseInt(start.split("-")[2]);
      }

      let endDay: number;
      if (end >= monthEndExclusive) {
        endDay = daysInMonth;
      } else {
        endDay = parseInt(end.split("-")[2]) - 1;
      }

      if (endDay < startDay) return null;

      const leftPercent = ((startDay - 1) / daysInMonth) * 100;
      const widthPercent = ((endDay - startDay + 1) / daysInMonth) * 100;
      return { leftPercent, widthPercent };
    };

    const aptBookings = bookings.filter(
      (b) =>
        b.apartment_id === apt.id &&
        b.check_in < monthEndExclusive &&
        b.check_out > monthStart
    );

    const aptBlocked = blockedDates.filter(
      (b) =>
        b.apartment_id === apt.id &&
        b.start_date < monthEndExclusive &&
        b.end_date > monthStart
    );

    return (
      <div key={apt.id} className="relative border-b border-stone-100" style={{ height: 40 }}>
        {/* Background grid cells */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}
        >
          {days.map((day) => (
            <div
              key={day}
              className={`border-r border-stone-50 ${
                isTodayFn(year, month, day)
                  ? "bg-[#c8a96e]/10"
                  : isWeekend(year, month, day)
                  ? "bg-stone-50/50"
                  : ""
              }`}
            />
          ))}
        </div>

        {/* Blocked periods */}
        {aptBlocked.map((block) => {
          const pos = calcBarPosition(block.start_date, block.end_date);
          if (!pos) return null;
          return (
            <button
              key={block.id}
              onClick={() => handleDeleteBlock(block.id)}
              disabled={deletingId === block.id}
              className="absolute top-0.5 bottom-0.5 rounded bg-red-200 bg-stripes opacity-70 hover:opacity-90 transition-opacity flex items-center px-1 overflow-hidden z-10 cursor-pointer"
              style={{
                left: `${pos.leftPercent}%`,
                width: `${pos.widthPercent}%`,
              }}
              title={`${block.reason || "Gesperrt"} — Klicken zum Aufheben`}
            >
              <span className="text-red-800 text-[9px] font-medium truncate">
                {block.reason?.replace("iCal: ", "") ?? "Gesperrt"}
              </span>
            </button>
          );
        })}

        {/* Booking bars */}
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
              className={`absolute top-0.5 bottom-0.5 rounded ${colors.bg} opacity-85 hover:opacity-100 transition-opacity flex items-center px-1 overflow-hidden z-20 shadow-sm`}
              style={{
                left: `${pos.leftPercent}%`,
                width: `${pos.widthPercent}%`,
              }}
              title={tooltip}
            >
              <span className={`${colors.text} text-[9px] font-medium truncate`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Year navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
        <button
          onClick={goToPrevYear}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Vorheriges Jahr"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="font-bold text-stone-900 text-lg">{year}</h2>
        <button
          onClick={goToNextYear}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Nächstes Jahr"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Month quick-jump pills */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-stone-100 overflow-x-auto">
        {monthNames.map((name, i) => {
          const isCurrentMonth = i + 1 === currentMonth;
          return (
            <button
              key={name}
              onClick={() => scrollToMonth(i)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isCurrentMonth
                  ? "bg-[#c8a96e] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-4 px-5 py-2.5 border-b border-stone-100 text-xs">
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

      {/* Horizontally scrollable months */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="flex" style={{ width: `${12 * 100}%` }}>
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const month = monthIndex + 1;
            const daysInMonth = new Date(year, month, 0).getDate();
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            return (
              <div
                key={month}
                ref={(el) => { monthRefs.current[monthIndex] = el; }}
                className="flex-shrink-0 border-r border-stone-200"
                style={{ width: `${100 / 12}%`, scrollSnapAlign: "start" }}
              >
                {/* Month header */}
                <div className="px-3 py-2 bg-stone-50 border-b border-stone-100 sticky top-0 z-30">
                  <h3 className="text-sm font-bold text-stone-800">{monthNames[monthIndex]}</h3>
                </div>

                {/* Day header row */}
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `100px repeat(${daysInMonth}, 1fr)` }}
                >
                  <div className="px-2 py-1 border-b border-r border-stone-100 bg-stone-50 text-[10px] font-medium text-stone-500 sticky left-0 z-10">
                    Wohnung
                  </div>
                  {days.map((day) => (
                    <div
                      key={day}
                      className={`py-1 border-b border-r border-stone-100 text-center text-[9px] leading-tight ${
                        isTodayFn(year, month, day)
                          ? "bg-[#c8a96e]/10 font-bold text-[#c8a96e]"
                          : isWeekend(year, month, day)
                          ? "bg-stone-50 text-stone-400"
                          : "text-stone-500"
                      }`}
                    >
                      <div className="font-medium">{getDayOfWeek(year, month, day)}</div>
                      <div>{day}</div>
                    </div>
                  ))}
                </div>

                {/* Apartment rows */}
                {apartments.map((apt) => (
                  <div
                    key={apt.id}
                    className="grid"
                    style={{ gridTemplateColumns: `100px 1fr` }}
                  >
                    <div className="px-2 py-1 border-b border-r border-stone-100 bg-stone-50 flex items-center sticky left-0 z-10">
                      <p className="text-[10px] font-medium text-stone-900 truncate">
                        {apt.name}
                      </p>
                    </div>
                    {renderMonthForApartment(apt, month)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
