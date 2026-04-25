import { Metadata } from "next";
import Link from "next/link";
import { getWaitlistEntries } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";
import WaitlistEntryActions from "@/components/admin/WaitlistEntryActions";

export const metadata: Metadata = {
  title: "Warteliste",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktiv", cls: "bg-emerald-100 text-emerald-700" },
  notified: { label: "Benachrichtigt", cls: "bg-blue-100 text-blue-700" },
  booked: { label: "Gebucht", cls: "bg-stone-200 text-stone-700" },
  expired: { label: "Abgelaufen", cls: "bg-stone-100 text-stone-500" },
  cancelled: { label: "Storniert", cls: "bg-red-100 text-red-700" },
};

const FILTERS = [
  { key: "active", label: "Aktiv" },
  { key: "notified", label: "Benachrichtigt" },
  { key: "all", label: "Alle" },
];

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const filter = searchParams.status ?? "active";
  const [entries, nameMap] = await Promise.all([
    getWaitlistEntries(filter),
    getApartmentNameMap(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Warteliste</h1>
          <p className="text-sm text-stone-500 mt-1">
            {entries.length}{" "}
            {entries.length === 1 ? "Eintrag" : "Einträge"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Link
                key={f.key}
                href={`/admin/warteliste?status=${f.key}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-[#c8a96e] text-white"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">Keine Einträge in dieser Ansicht.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Eingegangen</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Kontakt</th>
                  <th className="px-4 py-3">Wunschzeitraum</th>
                  <th className="px-4 py-3">Wohnung</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map((e) => {
                  const status = STATUS_LABELS[e.status as string] ?? {
                    label: e.status,
                    cls: "bg-stone-100",
                  };
                  return (
                    <tr key={e.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString("de-AT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-stone-900 font-medium whitespace-nowrap">
                        {e.first_name} {e.last_name}
                      </td>
                      <td className="px-4 py-3 text-stone-700 text-xs">
                        <a href={`mailto:${e.email}`} className="text-[#c8a96e] hover:underline block">
                          {e.email}
                        </a>
                        <a href={`tel:${e.phone}`} className="text-stone-500 block">
                          {e.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-700 whitespace-nowrap">
                        {new Date(
                          e.preferred_check_in + "T00:00:00"
                        ).toLocaleDateString("de-AT")}{" "}
                        –{" "}
                        {new Date(
                          e.preferred_check_out + "T00:00:00"
                        ).toLocaleDateString("de-AT")}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-700">
                        {e.apartment_id
                          ? nameMap.get(e.apartment_id) ?? e.apartment_id
                          : "egal"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <WaitlistEntryActions
                          id={e.id}
                          currentStatus={e.status as string}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
