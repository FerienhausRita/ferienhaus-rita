import { Metadata } from "next";
import Link from "next/link";
import { getGuests } from "../actions";
import GuestSearch from "@/components/admin/GuestSearch";

export const metadata: Metadata = {
  title: "Gäste",
};

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function GaestePage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const guests = await getGuests(searchParams.search);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Gäste</h1>
        <p className="text-stone-500 text-sm mt-1">
          {guests.length} Gäste insgesamt
        </p>
      </div>

      <GuestSearch currentSearch={searchParams.search} />

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-stone-200 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Kontakt</th>
                <th className="px-5 py-3 font-medium">Ort</th>
                <th className="px-5 py-3 font-medium">Aufenthalte</th>
                <th className="px-5 py-3 font-medium">Umsatz</th>
                <th className="px-5 py-3 font-medium">Letzter Besuch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {guests.map((guest) => (
                <tr key={guest.email} className="hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/gaeste/${encodeURIComponent(guest.email)}`}
                      className="font-medium text-stone-900 text-sm hover:text-[#c8a96e] transition-colors"
                    >
                      {guest.firstName} {guest.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`mailto:${guest.email}`}
                      className="text-sm text-stone-600 hover:text-[#c8a96e]"
                    >
                      {guest.email}
                    </a>
                    {guest.phone && (
                      <p className="text-xs text-stone-400">{guest.phone}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {guest.city}{guest.country ? `, ${guest.country}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 text-sm font-medium text-stone-700">
                      {guest.totalStays}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-stone-900">
                    {formatCurrency(guest.totalRevenue)}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {formatDate(guest.lastVisit)}
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-stone-400 text-sm"
                  >
                    Keine Gäste gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden mt-4 space-y-3">
        {guests.map((guest) => (
          <Link
            key={guest.email}
            href={`/admin/gaeste/${encodeURIComponent(guest.email)}`}
            className="block bg-white rounded-2xl border border-stone-200 p-4 active:bg-stone-50"
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-medium text-stone-900 text-sm">
                  {guest.firstName} {guest.lastName}
                </p>
                <p className="text-xs text-stone-500">{guest.email}</p>
              </div>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 text-sm font-medium text-stone-700">
                {guest.totalStays}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-stone-500">
                {guest.city} &middot; Letzter Besuch: {formatDate(guest.lastVisit)}
              </p>
              <p className="text-sm font-medium text-stone-900">
                {formatCurrency(guest.totalRevenue)}
              </p>
            </div>
          </Link>
        ))}
        {guests.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-12">
            Keine Gäste gefunden
          </p>
        )}
      </div>
    </div>
  );
}
