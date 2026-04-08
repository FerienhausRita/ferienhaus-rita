"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBlockedDate } from "@/app/(admin)/admin/actions";
import { useState } from "react";

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

const statusColors: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-emerald-500",
  completed: "bg-stone-400",
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

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Navigation
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  // Helper: check if a date falls within a range
  const isInRange = (day: number, start: string, end: string) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr >= start && dateStr < end; // end date is checkout/exclusive
  };

  // Helper: get day of week label
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

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Sperrung wirklich aufheben?")) return;
    setDeletingId(id);
    await deleteBlockedDate(id);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <Link
          href={`/admin/kalender?year=${prevYear}&month=${prevMonth}`}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="text-center">
          <h2 className="font-bold text-stone-900 text-lg">
            {monthNames[month - 1]} {year}
          </h2>
        </div>
        <Link
          href={`/admin/kalender?year=${nextYear}&month=${nextMonth}`}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* Legend */}
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

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: `140px repeat(${daysInMonth}, 1fr)` }}>
            <div className="px-3 py-2 border-b border-r border-stone-100 bg-stone-50 text-xs font-medium text-stone-500">
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

          {/* Apartment rows */}
          {apartments.map((apt) => {
            const aptBookings = bookings.filter(
              (b) => b.apartment_id === apt.id
            );
            const aptBlocked = blockedDates.filter(
              (b) => b.apartment_id === apt.id
            );

            return (
              <div
                key={apt.id}
                className="grid"
                style={{
                  gridTemplateColumns: `140px repeat(${daysInMonth}, 1fr)`,
                }}
              >
                {/* Apartment label */}
                <div className="px-3 py-3 border-b border-r border-stone-100 bg-stone-50">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {apt.name}
                  </p>
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  // Find booking for this day
                  const booking = aptBookings.find((b) =>
                    isInRange(day, b.check_in, b.check_out)
                  );
                  // Find blocked date for this day
                  const blocked = aptBlocked.find((b) =>
                    isInRange(day, b.start_date, b.end_date)
                  );

                  // Is this the first day of a booking in this month?
                  const isBookingStart =
                    booking &&
                    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` ===
                      booking.check_in;
                  // Is this the first day of a block in this month?
                  const isBlockStart =
                    blocked &&
                    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` ===
                      blocked.start_date;

                  return (
                    <div
                      key={day}
                      className={`relative border-b border-r border-stone-100 min-h-[44px] ${
                        isToday(day) ? "bg-[#c8a96e]/5" : isWeekend(day) ? "bg-stone-50/50" : ""
                      }`}
                    >
                      {booking && (
                        <Link
                          href={`/admin/buchungen/${booking.id}`}
                          className={`absolute inset-0.5 rounded ${
                            statusColors[booking.status] ?? "bg-stone-300"
                          } opacity-80 hover:opacity-100 transition-opacity flex items-center overflow-hidden`}
                          title={`${booking.first_name} ${booking.last_name} (${booking.status})`}
                        >
                          {isBookingStart && (
                            <span className="text-white text-[9px] font-medium px-1 truncate">
                              {booking.last_name}
                            </span>
                          )}
                        </Link>
                      )}
                      {blocked && !booking && (
                        <button
                          onClick={() => handleDeleteBlock(blocked.id)}
                          disabled={deletingId === blocked.id}
                          className="absolute inset-0.5 rounded bg-red-200 opacity-60 hover:opacity-80 transition-opacity bg-stripes flex items-center overflow-hidden"
                          title={`${blocked.reason} – Klicken zum Aufheben`}
                        >
                          {isBlockStart && (
                            <span className="text-red-800 text-[9px] font-medium px-1 truncate">
                              {blocked.reason?.replace("iCal: ", "") ?? "Gesperrt"}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
