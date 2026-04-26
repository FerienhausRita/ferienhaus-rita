import { Metadata } from "next";
import Link from "next/link";
import { getCleaningSchedule } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";
import { getCleaningConfig } from "@/lib/cleaning-config";
import {
  buildCleaningSlots,
  computeCleaningClusters,
  type CleaningSlotInput,
} from "@/lib/cleaning-schedule";

export const metadata: Metadata = {
  title: "Reinigungsplan",
};

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function daysFromToday(dateStr: string, todayIso: string): number {
  return Math.round(
    (new Date(dateStr + "T00:00:00").getTime() -
      new Date(todayIso + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

const RANGE_OPTIONS = [
  { days: 14, label: "14 Tage" },
  { days: 30, label: "1 Monat" },
  { days: 90, label: "3 Monate" },
  { days: 365, label: "Jahr" },
] as const;

const VIEW_OPTIONS = [
  { key: "cluster", label: "Empfohlene Tage" },
  { key: "list", label: "Alle Abreisen" },
] as const;
type ViewKey = (typeof VIEW_OPTIONS)[number]["key"];

export default async function ReinigungPage({
  searchParams,
}: {
  searchParams: { days?: string; view?: string };
}) {
  const daysParam = Number(searchParams.days ?? 14);
  const days = [14, 30, 90, 365].includes(daysParam) ? daysParam : 14;
  const view: ViewKey =
    searchParams.view === "list" ? "list" : "cluster";

  const today = new Date();
  const start = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split("T")[0];

  const [{ departures, arrivals }, nameMap, cleaningCfg] = await Promise.all([
    getCleaningSchedule(start, end),
    getApartmentNameMap(),
    getCleaningConfig(),
  ]);

  // Map: apartment_id → sortierte Anreisen (für nextArrival-Lookup)
  const arrivalsByApt = new Map<string, typeof arrivals>();
  for (const a of arrivals) {
    const list = arrivalsByApt.get(a.apartment_id) ?? [];
    list.push(a);
    arrivalsByApt.set(a.apartment_id, list);
  }
  for (const list of arrivalsByApt.values()) {
    list.sort((x, y) => x.check_in.localeCompare(y.check_in));
  }
  const findNextArrival = (apartmentId: string, afterDate: string) => {
    const list = arrivalsByApt.get(apartmentId) ?? [];
    return list.find((a) => a.check_in >= afterDate);
  };

  // CleaningSlotInput pro Abreise erzeugen
  const slotInputs: CleaningSlotInput[] = departures.map((dep) => {
    const next = findNextArrival(dep.apartment_id, dep.check_out);
    return {
      apartmentId: dep.apartment_id,
      apartmentName: nameMap.get(dep.apartment_id) ?? dep.apartment_id,
      bookingId: dep.id,
      guestFirstName: dep.first_name,
      guestLastName: dep.last_name,
      checkOut: dep.check_out,
      nextCheckIn: next?.check_in ?? null,
      nextGuestFirstName: next?.first_name ?? null,
      nextGuestLastName: next?.last_name ?? null,
      nextAdults: next?.adults,
      nextChildren: next?.children,
      nextInfants: (next as { infants?: number } | undefined)?.infants ?? 0,
      nextDogs: next?.dogs,
    };
  });

  const slots = buildCleaningSlots(slotInputs, cleaningCfg);
  const clusters = computeCleaningClusters(slots);

  // Für die Listen-Ansicht (Fallback): Abreisen nach Datum gruppiert
  const byDate = new Map<string, typeof departures>();
  for (const d of departures) {
    const existing = byDate.get(d.check_out) ?? [];
    existing.push(d);
    byDate.set(d.check_out, existing);
  }
  const arrivalMap = new Map<string, (typeof arrivals)[0]>();
  for (const a of arrivals) {
    arrivalMap.set(`${a.apartment_id}-${a.check_in}`, a);
  }
  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reinigungsplan</h1>
          <p className="text-sm text-stone-500 mt-1">
            {formatDate(start)} &ndash; {formatDate(end)} ·{" "}
            {cleaningCfg.buffer_days === 0
              ? "Reinigung am Anreisetag"
              : `${cleaningCfg.buffer_days} Tag${cleaningCfg.buffer_days === 1 ? "" : "e"} Puffer vor Anreise`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1">
            {VIEW_OPTIONS.map((opt) => {
              const active = opt.key === view;
              return (
                <Link
                  key={opt.key}
                  href={`/admin/reinigung?days=${days}&view=${opt.key}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    active
                      ? "bg-[#c8a96e] text-white"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
          {/* Range */}
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1">
            {RANGE_OPTIONS.map((opt) => {
              const active = opt.days === days;
              return (
                <Link
                  key={opt.days}
                  href={`/admin/reinigung?days=${opt.days}&view=${view}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    active
                      ? "bg-[#c8a96e] text-white"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {view === "cluster" ? (
        // ──────────── Cluster-Ansicht ────────────
        clusters.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">Keine Reinigungen im gew&auml;hlten Zeitraum.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clusters.map((cluster) => {
              const daysUntil = daysFromToday(cluster.day, start);
              const dayLabel =
                daysUntil === 0
                  ? "Heute"
                  : daysUntil === 1
                  ? "Morgen"
                  : daysUntil < 0
                  ? `vor ${Math.abs(daysUntil)} Tag${Math.abs(daysUntil) === 1 ? "" : "en"}`
                  : `in ${daysUntil} Tagen`;
              const isToday = daysUntil === 0;
              const isOverdue = daysUntil < 0;

              return (
                <div
                  key={cluster.day}
                  className={`rounded-2xl border overflow-hidden ${
                    cluster.hasTurnover
                      ? "border-red-300 bg-red-50/50"
                      : isToday
                      ? "border-amber-300 bg-amber-50/50"
                      : isOverdue
                      ? "border-red-300 bg-red-50/30"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="font-semibold text-stone-900">
                        {formatDate(cluster.day)}
                      </h2>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isToday
                            ? "bg-amber-100 text-amber-700"
                            : isOverdue
                            ? "bg-red-100 text-red-700"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {dayLabel}
                      </span>
                      {cluster.hasTurnover && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Wechsel-Tag (MUSS)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500">
                      {cluster.slots.length} Reinigung
                      {cluster.slots.length === 1 ? "" : "en"}
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100">
                    {cluster.slots.map((slot) => {
                      const bufferUntilNext = slot.nextCheckIn
                        ? Math.round(
                            (new Date(slot.nextCheckIn + "T00:00:00").getTime() -
                              new Date(cluster.day + "T00:00:00").getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : null;
                      return (
                        <div
                          key={slot.bookingId}
                          className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-stone-900">
                              {slot.apartmentName}
                            </p>
                            <p className="text-xs text-stone-500">
                              Abreise <strong className="text-stone-700">{slot.guestFirstName} {slot.guestLastName}</strong>{" "}
                              am {formatDate(slot.checkOut)}
                              {slot.nextCheckIn && slot.nextGuestFirstName && (
                                <>
                                  {" "}· nächste Anreise{" "}
                                  <strong className="text-stone-700">
                                    {slot.nextGuestFirstName} {slot.nextGuestLastName}
                                  </strong>{" "}
                                  am {formatDate(slot.nextCheckIn)}
                                  {bufferUntilNext !== null && (
                                    <>
                                      {" "}({bufferUntilNext === 0
                                        ? "selber Tag"
                                        : bufferUntilNext === 1
                                        ? "1 Tag Puffer"
                                        : `${bufferUntilNext} Tage Puffer`})
                                    </>
                                  )}
                                </>
                              )}
                            </p>
                            {slot.nextCheckIn &&
                              (slot.nextAdults ||
                                slot.nextChildren ||
                                slot.nextInfants ||
                                slot.nextDogs) && (
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                  Belegung danach: {slot.nextAdults ?? 0} Pers.
                                  {(slot.nextChildren ?? 0) > 0 &&
                                    ` + ${slot.nextChildren} Kinder`}
                                  {(slot.nextInfants ?? 0) > 0 &&
                                    ` + ${slot.nextInfants} Kleinkind${slot.nextInfants === 1 ? "" : "er"}`}
                                  {(slot.nextDogs ?? 0) > 0 &&
                                    ` · ${slot.nextDogs} Hund${slot.nextDogs === 1 ? "" : "e"}`}
                                </p>
                              )}
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-stone-500">
                              spätestens
                            </p>
                            <p
                              className={`font-medium ${
                                slot.isTurnover ? "text-red-600" : "text-stone-700"
                              }`}
                            >
                              {formatDate(slot.latest)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ──────────── Listen-Ansicht (Legacy / Fallback) ────────────
        sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">Keine Abreisen im gew&auml;hlten Zeitraum.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const deps = byDate.get(date)!;
              const isToday = date === start;
              const isTomorrow =
                date ===
                new Date(today.getTime() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0];

              return (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="font-semibold text-stone-900">
                      {formatDate(date)}
                    </h2>
                    {isToday && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Heute
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Morgen
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deps.map((dep) => {
                      const apartmentName =
                        nameMap.get(dep.apartment_id) ?? dep.apartment_id;
                      const sameDayArrival = arrivalMap.get(
                        `${dep.apartment_id}-${dep.check_out}`
                      );
                      const nextArrival =
                        sameDayArrival ??
                        findNextArrival(dep.apartment_id, dep.check_out);
                      const isTurnover = !!sameDayArrival;
                      return (
                        <div
                          key={dep.id}
                          className={`rounded-xl border p-4 ${
                            isTurnover
                              ? "border-red-200 bg-red-50/50"
                              : "border-stone-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-stone-900">
                              {apartmentName}
                            </p>
                            <div className="text-right text-xs text-stone-500">
                              {dep.adults} Pers.
                              {((dep as { infants?: number }).infants || 0) > 0 && (
                                <>
                                  {" "}+ {(dep as { infants?: number }).infants} Kleinkind
                                  {(dep as { infants?: number }).infants === 1 ? "" : "er"}
                                </>
                              )}
                              {dep.dogs > 0 &&
                                ` · ${dep.dogs} Hund${dep.dogs > 1 ? "e" : ""}`}
                            </div>
                          </div>
                          <p className="text-sm text-stone-600">
                            Abreise{" "}
                            <strong className="text-stone-800">
                              {dep.first_name} {dep.last_name}
                            </strong>
                          </p>
                          {nextArrival && (
                            <p className="text-xs text-stone-500 mt-1">
                              Nächste Anreise: {nextArrival.first_name}{" "}
                              {nextArrival.last_name} am{" "}
                              {formatDate(nextArrival.check_in)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
