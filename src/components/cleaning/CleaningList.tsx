import type { CleaningBooking } from "@/app/(cleaning)/actions";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

function PersonsBadge({
  adults,
  children,
  infants,
  dogs,
}: {
  adults: number;
  children: number;
  infants: number;
  dogs: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
        <span aria-hidden>👤</span>
        {adults} Erw.
      </span>
      {children > 0 && (
        <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
          <span aria-hidden>🧒</span>
          {children} Kind{children === 1 ? "" : "er"}
        </span>
      )}
      {infants > 0 && (
        <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
          <span aria-hidden>👶</span>
          {infants} Kleinkind{infants === 1 ? "" : "er"}
        </span>
      )}
      {dogs > 0 && (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          <span aria-hidden>🐕</span>
          {dogs} Hund{dogs === 1 ? "" : "e"}
        </span>
      )}
    </div>
  );
}

function BookingCard({
  b,
  highlight,
}: {
  b: CleaningBooking;
  highlight: "departure" | "arrival" | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 text-base truncate">
            {b.apartment_name}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {formatDate(b.check_in)} &ndash; {formatDate(b.check_out)}
          </p>
        </div>
        {highlight && (
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
              highlight === "departure"
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {highlight === "departure"
              ? `Abreise ${formatTime(b.departure_time)}`
              : `Anreise ${formatTime(b.arrival_time)}`}
          </span>
        )}
      </div>

      <div className="text-sm text-stone-700 mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-stone-500">Anreise</p>
          <p className="font-medium">{formatTime(b.arrival_time)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Abreise</p>
          <p className="font-medium">{formatTime(b.departure_time)}</p>
        </div>
      </div>

      <PersonsBadge
        adults={b.adults}
        children={b.children}
        infants={b.infants}
        dogs={b.dogs}
      />

      {b.cleaning_note && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          <p className="font-medium text-xs uppercase tracking-wider mb-1 text-amber-700">
            Notiz für die Reinigung
          </p>
          <p className="whitespace-pre-wrap">{b.cleaning_note}</p>
        </div>
      )}
    </div>
  );
}

export default function CleaningList({ bookings }: { bookings: CleaningBooking[] }) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Departures = Reinigung fällig
  const departuresToday = bookings.filter((b) => b.check_out === today);
  const arrivalsToday = bookings.filter((b) => b.check_in === today);

  const departuresTomorrow = bookings.filter((b) => b.check_out === tomorrow);
  const arrivalsTomorrow = bookings.filter((b) => b.check_in === tomorrow);

  // Künftige Buchungen ab übermorgen — nach Tag gruppiert (Abreise-Datum)
  const future = bookings.filter(
    (b) => b.check_out > tomorrow || (b.check_in > tomorrow && b.check_out > tomorrow)
  );

  // Map: Datum → { departures, arrivals }
  const futureByDate = new Map<string, { dep: CleaningBooking[]; arr: CleaningBooking[] }>();
  for (const b of future) {
    if (b.check_out > tomorrow) {
      const e = futureByDate.get(b.check_out) ?? { dep: [], arr: [] };
      e.dep.push(b);
      futureByDate.set(b.check_out, e);
    }
    if (b.check_in > tomorrow) {
      const e = futureByDate.get(b.check_in) ?? { dep: [], arr: [] };
      e.arr.push(b);
      futureByDate.set(b.check_in, e);
    }
  }
  const futureDates = Array.from(futureByDate.keys()).sort();

  const Section = ({
    title,
    departures,
    arrivals,
    emptyHint,
  }: {
    title: string;
    departures: CleaningBooking[];
    arrivals: CleaningBooking[];
    emptyHint?: string;
  }) => {
    const total = departures.length + arrivals.length;
    return (
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <span className="text-xs text-stone-500">
            {total === 0
              ? "—"
              : `${departures.length} Abreise${departures.length === 1 ? "" : "n"}, ${arrivals.length} Anreise${arrivals.length === 1 ? "" : "n"}`}
          </span>
        </div>
        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center text-sm text-stone-500">
            {emptyHint ?? "Keine Vorgänge."}
          </div>
        ) : (
          <div className="space-y-3">
            {departures.map((b) => (
              <BookingCard key={`d-${b.id}`} b={b} highlight="departure" />
            ))}
            {arrivals.map((b) => (
              <BookingCard key={`a-${b.id}`} b={b} highlight="arrival" />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Section
        title="Heute"
        departures={departuresToday}
        arrivals={arrivalsToday}
        emptyHint="Heute keine Reinigungen fällig."
      />
      <Section
        title="Morgen"
        departures={departuresTomorrow}
        arrivals={arrivalsTomorrow}
      />

      {futureDates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">
            Nächste Tage
          </h2>
          <div className="space-y-6">
            {futureDates.map((date) => {
              const e = futureByDate.get(date)!;
              return (
                <div key={date}>
                  <p className="text-sm font-medium text-stone-600 mb-2">
                    {formatDate(date)}
                  </p>
                  <div className="space-y-3">
                    {e.dep.map((b) => (
                      <BookingCard key={`fd-${b.id}`} b={b} highlight="departure" />
                    ))}
                    {e.arr.map((b) => (
                      <BookingCard key={`fa-${b.id}`} b={b} highlight="arrival" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
