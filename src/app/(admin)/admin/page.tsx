import { Metadata } from "next";
import Link from "next/link";
import { getDashboardStats, getAnalyticsData } from "./actions";
import { apartments } from "@/data/apartments";
import RevenueChart from "@/components/admin/RevenueChart";
import OccupancyStats from "@/components/admin/OccupancyStats";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Force dynamic rendering
export const dynamic = "force-dynamic";

function getApartmentName(id: string) {
  return apartments.find((a) => a.id === id)?.name ?? id;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
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
  partial: { label: "Teilweise", className: "text-amber-600" },
  paid: { label: "Bezahlt", className: "text-emerald-600" },
  refunded: { label: "Erstattet", className: "text-stone-500" },
};

export default async function AdminDashboard() {
  const [stats, analytics] = await Promise.all([
    getDashboardStats(),
    getAnalyticsData(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">
          Willkommen im Admin-Bereich von Ferienhaus Rita
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/buchungen?filter=pending"
          className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-[#c8a96e]/30 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {stats.pendingCount}
          </p>
          <p className="text-sm text-stone-500">Offene Anfragen</p>
        </Link>

        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 100 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {formatCurrency(stats.monthRevenue)}
          </p>
          <p className="text-sm text-stone-500">Umsatz diesen Monat</p>
        </div>

        <Link
          href="/admin/nachrichten"
          className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-[#c8a96e]/30 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {stats.unreadMessages}
          </p>
          <p className="text-sm text-stone-500">Ungelesene Nachrichten</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Arrivals */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">
              Anreisen (nächste 7 Tage)
            </h2>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
              {stats.upcomingArrivals.length}
            </span>
          </div>
          <div className="divide-y divide-stone-100">
            {stats.upcomingArrivals.length === 0 ? (
              <p className="p-5 text-sm text-stone-400">Keine Anreisen</p>
            ) : (
              stats.upcomingArrivals.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/buchungen/${booking.id}`}
                  className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-stone-900 text-sm">
                      {booking.first_name} {booking.last_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {getApartmentName(booking.apartment_id)} &middot;{" "}
                      {booking.adults + (booking.children || 0)} Gäste
                      {booking.dogs ? ` + ${booking.dogs} Hund${booking.dogs > 1 ? "e" : ""}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-900">
                      {formatDate(booking.check_in)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        statusLabels[booking.status]?.className ?? ""
                      }`}
                    >
                      {statusLabels[booking.status]?.label ?? booking.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Departures */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">
              Abreisen (nächste 7 Tage)
            </h2>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
              {stats.upcomingDepartures.length}
            </span>
          </div>
          <div className="divide-y divide-stone-100">
            {stats.upcomingDepartures.length === 0 ? (
              <p className="p-5 text-sm text-stone-400">Keine Abreisen</p>
            ) : (
              stats.upcomingDepartures.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/buchungen/${booking.id}`}
                  className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-stone-900 text-sm">
                      {booking.first_name} {booking.last_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {getApartmentName(booking.apartment_id)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-stone-900">
                    {formatDate(booking.check_out)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="mt-6 bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Letzte Buchungen</h2>
          <Link
            href="/admin/buchungen"
            className="text-sm text-[#c8a96e] hover:text-[#b89555] font-medium"
          >
            Alle anzeigen
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-stone-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Gast</th>
                <th className="px-5 py-3 font-medium">Wohnung</th>
                <th className="px-5 py-3 font-medium">Zeitraum</th>
                <th className="px-5 py-3 font-medium">Betrag</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Zahlung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stats.recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-stone-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/buchungen/${booking.id}`}
                      className="font-medium text-stone-900 text-sm hover:text-[#c8a96e]"
                    >
                      {booking.first_name} {booking.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {getApartmentName(booking.apartment_id)}
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-600">
                    {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
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
                      {paymentLabels[booking.payment_status]?.label ?? booking.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-stone-100">
          {stats.recentBookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/admin/buchungen/${booking.id}`}
              className="block p-4 hover:bg-stone-50"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-stone-900 text-sm">
                  {booking.first_name} {booking.last_name}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    statusLabels[booking.status]?.className ?? ""
                  }`}
                >
                  {statusLabels[booking.status]?.label ?? booking.status}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {getApartmentName(booking.apartment_id)} &middot;{" "}
                {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-medium text-stone-900">
                  {formatCurrency(Number(booking.total_price))}
                </p>
                <span
                  className={`text-xs font-medium ${
                    paymentLabels[booking.payment_status]?.className ?? ""
                  }`}
                >
                  {paymentLabels[booking.payment_status]?.label ?? booking.payment_status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Analytics</h2>

        {/* Revenue Chart - full width */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6">
          <h3 className="font-medium text-stone-700 text-sm mb-4">
            Monatlicher Umsatz (letzte 12 Monate)
          </h3>
          <RevenueChart data={analytics.monthlyRevenue} />
        </div>

        {/* Bottom grid: Occupancy + Summary cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Occupancy Stats - takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-medium text-stone-700 text-sm mb-4">
              Auslastung {new Date().getFullYear()}
            </h3>
            <OccupancyStats data={analytics.occupancyByApartment} />
          </div>

          {/* Summary cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(analytics.avgBookingValue)}
              </p>
              <p className="text-sm text-stone-500">Ø Buchungswert</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {analytics.totalGuests}
              </p>
              <p className="text-sm text-stone-500">Gäste gesamt</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-900">
                {analytics.totalGuests > 0
                  ? Math.round((analytics.returningGuests / analytics.totalGuests) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-stone-500">
                Wiederkehrende Gäste
                <span className="text-stone-400 ml-1">
                  ({analytics.returningGuests})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
