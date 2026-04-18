interface Booking {
  id: string;
  apartment_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
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

interface CaretakerListProps {
  bookings: Booking[];
  apartmentNames: Map<string, string>;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function nights(checkIn: string, checkOut: string): number {
  const ms =
    new Date(checkOut + "T00:00:00").getTime() -
    new Date(checkIn + "T00:00:00").getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function CaretakerList({
  bookings,
  apartmentNames,
}: CaretakerListProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
        Keine Buchungen im gewählten Zeitraum.
      </div>
    );
  }

  // Sort by check_in, then by apartment
  const sorted = [...bookings].sort((a, b) => {
    if (a.check_in !== b.check_in) return a.check_in.localeCompare(b.check_in);
    return a.apartment_id.localeCompare(b.apartment_id);
  });

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-900">Detailliste</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Alle Belegungen im gewählten Zeitraum · sortiert nach Anreise
          </p>
        </div>
        <span className="text-xs text-stone-500">
          {sorted.length} Buchung{sorted.length !== 1 ? "en" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr className="text-left text-xs text-stone-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Wohnung</th>
              <th className="py-3 px-4 font-medium">Anreise</th>
              <th className="py-3 px-4 font-medium">Abreise</th>
              <th className="py-3 px-4 font-medium text-center">Nächte</th>
              <th className="py-3 px-4 font-medium">Gast</th>
              <th className="py-3 px-4 font-medium text-center">Personen</th>
              <th className="py-3 px-4 font-medium text-center">Hunde</th>
              <th className="py-3 px-4 font-medium">Telefon</th>
              <th className="py-3 px-4 font-medium">Notizen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((b) => {
              const isPending = b.status === "pending";
              const turnover = b.isTurnoverIn || b.isTurnoverOut;
              return (
                <tr
                  key={b.id}
                  className={`${isPending ? "bg-amber-50/40" : ""} hover:bg-stone-50`}
                >
                  <td className="py-3 px-4 font-medium text-stone-900">
                    {apartmentNames.get(b.apartment_id) ?? b.apartment_id}
                    {isPending && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        Anfrage
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-700 whitespace-nowrap">
                    {fmtDate(b.check_in)}
                    {b.isTurnoverIn && (
                      <span
                        className="ml-1.5 inline-block text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold"
                        title="Am selben Tag Abreise eines anderen Gastes"
                      >
                        Wechsel
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-700 whitespace-nowrap">
                    {fmtDate(b.check_out)}
                    {b.isTurnoverOut && (
                      <span
                        className="ml-1.5 inline-block text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold"
                        title="Am selben Tag Anreise eines anderen Gastes"
                      >
                        Wechsel
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-stone-600">
                    {nights(b.check_in, b.check_out)}
                  </td>
                  <td className="py-3 px-4 text-stone-900 font-medium">
                    {b.first_name} {b.last_name}
                  </td>
                  <td className="py-3 px-4 text-center text-stone-700 whitespace-nowrap">
                    {b.adults}E
                    {b.children > 0 && <> · {b.children}K</>}
                  </td>
                  <td className="py-3 px-4 text-center text-stone-700">
                    {b.dogs > 0 ? (
                      <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                        🐕 {b.dogs}
                      </span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                    {b.phone ? (
                      <a
                        href={`tel:${b.phone}`}
                        className="hover:text-stone-900"
                      >
                        {b.phone}
                      </a>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-600 text-xs max-w-sm">
                    {b.notes ? (
                      <span className="whitespace-pre-wrap break-words">
                        {b.notes}
                      </span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Turnover summary */}
      {sorted.some((b) => b.isTurnoverIn || b.isTurnoverOut) && (
        <div className="px-5 py-3 border-t border-stone-100 bg-amber-50/40 text-xs text-amber-900">
          <strong>Hinweis:</strong> Wechseltage sind mit einem roten Badge
          markiert. An diesen Tagen muss die Wohnung zwischen Abreise und
          Anreise gereinigt werden.
        </div>
      )}
    </div>
  );
}
