import { Metadata } from "next";
import Link from "next/link";
import { getCleaningSchedule } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";

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

const RANGE_OPTIONS = [
  { days: 14, label: "14 Tage" },
  { days: 30, label: "1 Monat" },
  { days: 90, label: "3 Monate" },
  { days: 365, label: "Jahr" },
] as const;

export default async function ReinigungPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const daysParam = Number(searchParams.days ?? 14);
  const days = [14, 30, 90, 365].includes(daysParam) ? daysParam : 14;

  const today = new Date();
  const start = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split("T")[0];

  const [{ departures, arrivals }, nameMap] = await Promise.all([
    getCleaningSchedule(start, end),
    getApartmentNameMap(),
  ]);

  // Group departures by date
  const byDate = new Map<string, typeof departures>();
  for (const d of departures) {
    const existing = byDate.get(d.check_out) ?? [];
    existing.push(d);
    byDate.set(d.check_out, existing);
  }

  // Build arrival map: apartment_id → next arrival after a departure
  // Zusätzlich: chronologisch sortierte Anreise-Liste pro Wohnung,
  // damit wir für jede Abreise die nächste Anreise finden (auch in X Tagen).
  const arrivalMap = new Map<string, (typeof arrivals)[0]>();
  const arrivalsByApt = new Map<string, typeof arrivals>();
  for (const a of arrivals) {
    const key = `${a.apartment_id}-${a.check_in}`;
    arrivalMap.set(key, a);
    const list = arrivalsByApt.get(a.apartment_id) ?? [];
    list.push(a);
    arrivalsByApt.set(a.apartment_id, list);
  }
  // pre-sort (defensive)
  for (const list of arrivalsByApt.values()) {
    list.sort((x, y) => x.check_in.localeCompare(y.check_in));
  }
  const findNextArrival = (apartmentId: string, afterDate: string) => {
    const list = arrivalsByApt.get(apartmentId) ?? [];
    return list.find((a) => a.check_in >= afterDate);
  };
  const daysBetween = (from: string, to: string) =>
    Math.round(
      (new Date(to + "T00:00:00").getTime() -
        new Date(from + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    );

  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reinigungsplan</h1>
          <p className="text-sm text-stone-500 mt-1">
            {formatDate(start)} &ndash; {formatDate(end)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1">
          {RANGE_OPTIONS.map((opt) => {
            const active = opt.days === days;
            return (
              <Link
                key={opt.days}
                href={`/admin/reinigung?days=${opt.days}`}
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

      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">Keine Abreisen im gew&auml;hlten Zeitraum</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const deps = byDate.get(date)!;
            const isToday = date === start;
            const isTomorrow =
              date === new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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
                    const apartmentName = nameMap.get(dep.apartment_id) ?? dep.apartment_id;
                    // Turnover: Anreise am selben Tag (check_in === check_out)
                    const sameDayArrival = arrivalMap.get(`${dep.apartment_id}-${dep.check_out}`);
                    // Sonst: nächste Anreise danach (für "Puffer-Zeit")
                    const nextArrival =
                      sameDayArrival ??
                      findNextArrival(dep.apartment_id, dep.check_out);
                    const isTurnover = !!sameDayArrival;
                    const daysUntilNext = nextArrival
                      ? daysBetween(dep.check_out, nextArrival.check_in)
                      : null;

                    return (
                      <div
                        key={dep.id}
                        className={`rounded-xl border p-4 ${
                          isTurnover
                            ? "border-red-200 bg-red-50/50"
                            : nextArrival && daysUntilNext !== null && daysUntilNext <= 2
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-stone-900">
                              {apartmentName}
                            </p>
                            {isTurnover && (
                              <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                Wechsel heute!
                              </span>
                            )}
                          </div>
                          <div className="text-right text-xs text-stone-500">
                            {dep.adults + (dep.children || 0)} Pers.
                            {dep.dogs > 0 && ` + ${dep.dogs} Hund${dep.dogs > 1 ? "e" : ""}`}
                          </div>
                        </div>

                        {/* Departing guest */}
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                          <span className="text-stone-700">
                            {dep.first_name} {dep.last_name}
                          </span>
                          <span className="text-stone-400 text-xs">Abreise</span>
                        </div>

                        {/* Next arrival — immer anzeigen, wenn im Zeitraum */}
                        {nextArrival ? (
                          <div className="flex items-center gap-2 text-sm pt-1">
                            <svg
                              className={`w-4 h-4 shrink-0 ${
                                isTurnover
                                  ? "text-red-500"
                                  : daysUntilNext !== null && daysUntilNext <= 2
                                  ? "text-amber-500"
                                  : "text-emerald-500"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                              />
                            </svg>
                            <span className="text-stone-700">
                              {nextArrival.first_name} {nextArrival.last_name}
                            </span>
                            <span className="text-stone-400 text-xs ml-auto">
                              {isTurnover
                                ? "heute"
                                : daysUntilNext === 1
                                ? "morgen"
                                : `in ${daysUntilNext} Tagen`}{" "}
                              ({formatDate(nextArrival.check_in)})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs pt-1 text-stone-400">
                            <svg
                              className="w-3.5 h-3.5 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>Keine weitere Buchung im Zeitraum</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
