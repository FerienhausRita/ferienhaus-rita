import { Metadata } from "next";
import Link from "next/link";
import { getBookings } from "../actions";
import { apartments } from "@/data/apartments";
import BookingFilters from "@/components/admin/BookingFilters";

export const metadata: Metadata = {
  title: "Buchungen",
};

export const dynamic = "force-dynamic";

function getApartmentName(id: string) {
  return apartments.find((a) => a.id === id)?.name ?? id;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Offen", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Bestätigt", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Abgeschlossen", className: "bg-stone-100 text-stone-600" },
  cancelled: { label: "Storniert", className: "bg-red-100 text-red-700" },
};

const paymentLabels: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Offen", className: "text-red-600" },
  deposit_paid: { label: "Anzahlung", className: "text-amber-600" },
  paid: { label: "Bezahlt", className: "text-emerald-600" },
  refunded: { label: "Erstattet", className: "text-stone-500" },
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { filter?: string; search?: string };
}) {
  const bookings = await getBookings(searchParams.filter, searchParams.search);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Buchungen</h1>
          <p className="text-stone-500 text-sm mt-1">
            {bookings.length} Buchung{bookings.length !== 1 ? "en" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/import"
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 text-sm font-medium rounded-xl hover:border-[#c8a96e]/50 hover:text-[#c8a96e] transition-colors"
          >
            Import
          </Link>
          <Link
            href="/admin/buchungen/neu"
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
          >
            + Neue Buchung
          </Link>
        </div>
      </div>

      <BookingFilters
        currentFilter={searchParams.filter}
        currentSearch={searchParams.search}
      />

      {/* Desktop Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-stone-200 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                <th className="px-5 py-3 font-medium">Gast</th>
                <th className="px-5 py-3 font-medium">Wohnung</th>
                <th className="px-5 py-3 font-medium">Zeitraum</th>
                <th className="px-5 py-3 font-medium">Gäste</th>
                <th className="px-5 py-3 font-medium">Betrag</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Zahlung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/buchungen/${booking.id}`}
                      className="font-medium text-stone-900 text-sm hover:text-[#c8a96e] transition-colors"
                    >
                      {booking.first_name} {booking.last_name}
                    </Link>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {booking.email}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {getApartmentName(booking.apartment_id)}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600 whitespace-nowrap">
                    {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {booking.adults}E {booking.children > 0 ? `${booking.children}K ` : ""}
                    {booking.dogs > 0 ? `${booking.dogs}H` : ""}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-stone-900">
                    {formatCurrency(Number(booking.total_price))}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusLabels[booking.status]?.className ?? ""
                      }`}
                    >
                      {statusLabels[booking.status]?.label ?? booking.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium ${
                        paymentLabels[booking.payment_status]?.className ?? ""
                      }`}
                    >
                      {paymentLabels[booking.payment_status]?.label ??
                        booking.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-stone-400 text-sm"
                  >
                    Keine Buchungen gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden mt-4 space-y-3">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/admin/buchungen/${booking.id}`}
            className="block bg-white rounded-2xl border border-stone-200 p-4 active:bg-stone-50"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-stone-900 text-sm">
                  {booking.first_name} {booking.last_name}
                </p>
                <p className="text-xs text-stone-500">
                  {getApartmentName(booking.apartment_id)}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusLabels[booking.status]?.className ?? ""
                }`}
              >
                {statusLabels[booking.status]?.label ?? booking.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500">
                {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
                &middot; {booking.adults}E
                {booking.children > 0 ? ` ${booking.children}K` : ""}
                {booking.dogs > 0 ? ` ${booking.dogs}H` : ""}
              </p>
              <p className="text-sm font-medium text-stone-900">
                {formatCurrency(Number(booking.total_price))}
              </p>
            </div>
          </Link>
        ))}
        {bookings.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-12">
            Keine Buchungen gefunden
          </p>
        )}
      </div>
    </div>
  );
}
