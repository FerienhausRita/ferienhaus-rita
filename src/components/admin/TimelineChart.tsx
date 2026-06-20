"use client";

import Link from "next/link";

interface Booking {
  id: string;
  apartment_id: string;
  first_name: string;
  last_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  dogs: number;
  status: string;
  notes: string | null;
  isTurnoverIn?: boolean;
  isTurnoverOut?: boolean;
}

interface Block {
  id: string;
  apartment_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface ApartmentRow {
  id: string;
  name: string;
}

interface TimelineChartProps {
  apartments: ApartmentRow[];
  bookings: Booking[];
  blocks: Block[];
  startDate: string; // YYYY-MM-DD
  days: number;
}

function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDayLabel(d: Date): string {
  return String(d.getDate()).padStart(2, "0");
}

function formatWeekdayLabel(d: Date): string {
  return d.toLocaleDateString("de-AT", { weekday: "short" });
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("de-AT", { month: "short" });
}

/** Number of days from start to target (0-based, clamped to [0, days]) */
function dayOffset(startIso: string, targetIso: string, days: number): number {
  const s = parseDate(startIso).getTime();
  const t = parseDate(targetIso).getTime();
  const n = Math.round((t - s) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(days, n));
}

/**
 * Compute bar position using the hotellerie convention:
 * bar occupies the right half of the check-in day and the left half of the
 * check-out day, so a follow-up guest arriving on the same check-out day
 * visually picks up at the middle of that day.
 */
function hotelBarPosition(
  windowStart: string,
  start: string,
  end: string,
  days: number,
  dayWidth: number
): { left: number; width: number } | null {
  const ws = parseDate(windowStart).getTime();
  const rawStart = (parseDate(start).getTime() - ws) / (1000 * 60 * 60 * 24);
  const rawEnd = (parseDate(end).getTime() - ws) / (1000 * 60 * 60 * 24);

  // Middle-to-middle raw positions (in day units)
  let leftUnits = rawStart + 0.5;
  let rightUnits = rawEnd + 0.5;

  // Clip to visible window
  if (leftUnits < 0) leftUnits = 0;
  if (rightUnits > days) rightUnits = days;

  const width = (rightUnits - leftUnits) * dayWidth;
  if (width <= 0) return null;
  return { left: leftUnits * dayWidth, width };
}

export default function TimelineChart({
  apartments,
  bookings,
  blocks,
  startDate,
  days,
}: TimelineChartProps) {
  const startD = parseDate(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = dayOffset(
    startDate,
    today.toISOString().split("T")[0],
    days
  );

  // Build day headers
  const dayCells = Array.from({ length: days }, (_, i) => {
    const d = addDays(startD, i);
    return {
      date: d,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday:
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear(),
    };
  });

  // Each day = 40px wide on screen, 24px on print
  const DAY_WIDTH = 48;
  const ROW_HEIGHT = 64;
  const LABEL_WIDTH = 160;

  const totalWidth = LABEL_WIDTH + days * DAY_WIDTH;

  const bookingsByApt = new Map<string, Booking[]>();
  for (const b of bookings) {
    const arr = bookingsByApt.get(b.apartment_id) ?? [];
    arr.push(b);
    bookingsByApt.set(b.apartment_id, arr);
  }
  const blocksByApt = new Map<string, Block[]>();
  for (const bl of blocks) {
    const arr = blocksByApt.get(bl.apartment_id) ?? [];
    arr.push(bl);
    blocksByApt.set(bl.apartment_id, arr);
  }

  function guestCountLabel(b: Booking): string {
    const parts: string[] = [];
    parts.push(`${b.adults}E`);
    if (b.children > 0) parts.push(`${b.children}K`);
    if (b.dogs > 0) parts.push(`${b.dogs}🐕`);
    return parts.join(" ");
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="overflow-x-auto timeline-scroll">
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, minWidth: "100%" }}
        >
          {/* Day headers */}
          <div
            className="flex sticky top-0 bg-stone-50 border-b border-stone-200 z-10"
            style={{ height: "56px" }}
          >
            <div
              className="shrink-0 border-r border-stone-200 bg-stone-50 flex items-end px-3 pb-2"
              style={{ width: `${LABEL_WIDTH}px` }}
            >
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Wohnung
              </span>
            </div>
            {dayCells.map((cell, i) => (
              <div
                key={i}
                className={`shrink-0 flex flex-col items-center justify-end pb-1 border-r border-stone-100 ${
                  cell.isWeekend ? "bg-stone-100/60" : ""
                } ${cell.isToday ? "bg-[#c8a96e]/10" : ""}`}
                style={{ width: `${DAY_WIDTH}px` }}
              >
                {(i === 0 || cell.date.getDate() === 1) && (
                  <span className="text-[10px] text-stone-400 uppercase font-medium">
                    {formatMonthLabel(cell.date)}
                  </span>
                )}
                <span className="text-[10px] text-stone-400 uppercase">
                  {formatWeekdayLabel(cell.date)}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    cell.isToday ? "text-[#c8a96e]" : "text-stone-700"
                  }`}
                >
                  {formatDayLabel(cell.date)}
                </span>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="relative">
            {/* Today line (vertical) */}
            {todayOffset > 0 && todayOffset < days && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-[#c8a96e] z-20 pointer-events-none"
                style={{
                  left: `${LABEL_WIDTH + todayOffset * DAY_WIDTH}px`,
                }}
              />
            )}

            {apartments.map((apt) => {
              const aptBookings = bookingsByApt.get(apt.id) ?? [];
              const aptBlocks = blocksByApt.get(apt.id) ?? [];

              return (
                <div
                  key={apt.id}
                  className="flex border-b border-stone-100 relative"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {/* Apartment label */}
                  <div
                    className="shrink-0 border-r border-stone-200 bg-white sticky left-0 z-10 flex items-center px-3"
                    style={{ width: `${LABEL_WIDTH}px` }}
                  >
                    <span className="text-sm font-medium text-stone-900 truncate">
                      {apt.name}
                    </span>
                  </div>

                  {/* Day grid background (weekends) */}
                  <div className="relative flex-1">
                    <div className="absolute inset-0 flex">
                      {dayCells.map((cell, i) => (
                        <div
                          key={i}
                          className={`shrink-0 border-r border-stone-100 ${
                            cell.isWeekend ? "bg-stone-50" : ""
                          }`}
                          style={{ width: `${DAY_WIDTH}px` }}
                        />
                      ))}
                    </div>

                    {/* Blocks (gray) — hotellerie convention: middle-to-middle */}
                    {aptBlocks.map((bl) => {
                      const pos = hotelBarPosition(
                        startDate,
                        bl.start_date,
                        bl.end_date,
                        days,
                        DAY_WIDTH
                      );
                      if (!pos) return null;
                      return (
                        <div
                          key={bl.id}
                          className="absolute top-2 bottom-2 rounded-md bg-stone-300/60 border border-stone-400/60 flex items-center px-2"
                          style={{
                            left: `${pos.left}px`,
                            width: `${Math.max(0, pos.width - 2)}px`,
                          }}
                          title={bl.reason ?? "Blockiert"}
                        >
                          <span className="text-[10px] text-stone-700 font-medium truncate">
                            {bl.reason ?? "Blockiert"}
                          </span>
                        </div>
                      );
                    })}

                    {/* Bookings — hotellerie convention: middle-to-middle */}
                    {aptBookings.map((b) => {
                      const pos = hotelBarPosition(
                        startDate,
                        b.check_in,
                        b.check_out,
                        days,
                        DAY_WIDTH
                      );
                      if (!pos) return null;

                      const isPending = b.status === "pending";
                      const barColor = isPending
                        ? "bg-amber-100 border-amber-400 text-amber-900 bg-stripe"
                        : "bg-[#c8a96e] border-[#b89555] text-white";

                      return (
                        <Link
                          key={b.id}
                          href={`/admin/buchungen/${b.id}`}
                          className={`absolute top-2 bottom-2 rounded-lg border flex items-center px-2 overflow-hidden hover:brightness-95 transition-all group ${barColor}`}
                          style={{
                            left: `${pos.left + 1}px`,
                            width: `${Math.max(0, pos.width - 2)}px`,
                            zIndex: 5,
                          }}
                          title={`${b.last_name} · ${b.check_in} → ${b.check_out}${b.notes ? ` · ${b.notes}` : ""}`}
                        >
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-[11px] font-semibold truncate">
                              {b.last_name || "—"}
                            </span>
                            <span className="text-[10px] opacity-90 truncate">
                              {guestCountLabel(b)}
                            </span>
                          </div>
                          {b.notes && (
                            <span
                              className="ml-auto text-[10px] shrink-0"
                              title={b.notes}
                            >
                              📝
                            </span>
                          )}
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-stone-100 text-xs text-stone-500 bg-stone-50">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-[#c8a96e]" />
          <span>Bestätigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-amber-100 border border-amber-400 bg-stripe" />
          <span>Anfrage</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded bg-stone-300/60 border border-stone-400/60" />
          <span>Blockiert</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-[18px] bg-[#c8a96e]" style={{ width: "2px" }} />
          <span>Heute</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-400">
          <span>Balken von Tag-Mitte zu Tag-Mitte — Wechseltage schließen nahtlos an</span>
        </div>
      </div>

      <style jsx>{`
        .bg-stripe {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.4),
            rgba(255, 255, 255, 0.4) 4px,
            transparent 4px,
            transparent 8px
          );
        }
      `}</style>
    </div>
  );
}
