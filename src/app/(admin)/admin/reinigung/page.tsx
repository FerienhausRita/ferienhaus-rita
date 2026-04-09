import { Metadata } from "next";
import { getCleaningSchedule } from "../actions";
import { getApartmentById, apartments } from "@/data/apartments";

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

export default async function ReinigungPage() {
  const today = new Date();
  const start = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split("T")[0];

  const { departures, arrivals } = await getCleaningSchedule(start, end);

  // Group departures by date
  const byDate = new Map<string, typeof departures>();
  for (const d of departures) {
    const existing = byDate.get(d.check_out) ?? [];
    existing.push(d);
    byDate.set(d.check_out, existing);
  }

  // Build arrival map: apartment_id → next arrival after a departure
  const arrivalMap = new Map<string, (typeof arrivals)[0]>();
  for (const a of arrivals) {
    const key = `${a.apartment_id}-${a.check_in}`;
    arrivalMap.set(key, a);
  }

  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reinigungsplan</h1>
          <p className="text-sm text-stone-500 mt-1">
            N&auml;chste 14 Tage &middot; {formatDate(start)} &ndash; {formatDate(end)}
          </p>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">Keine Abreisen in den n&auml;chsten 14 Tagen</p>
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
                    const apartment = getApartmentById(dep.apartment_id);
                    // Find next arrival for same apartment on this date
                    const nextArrival = arrivalMap.get(`${dep.apartment_id}-${dep.check_out}`);
                    const isTurnover = !!nextArrival;

                    return (
                      <div
                        key={dep.id}
                        className={`rounded-xl border p-4 ${
                          isTurnover
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-stone-900">
                              {apartment?.name ?? dep.apartment_id}
                            </p>
                            {isTurnover && (
                              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                Wechsel
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

                        {/* Arriving guest (if turnover) */}
                        {nextArrival && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            <span className="text-stone-700">
                              {nextArrival.first_name} {nextArrival.last_name}
                            </span>
                            <span className="text-stone-400 text-xs">Anreise</span>
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
