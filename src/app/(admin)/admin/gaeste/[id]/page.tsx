import { Metadata } from "next";
import Link from "next/link";
import { getGuestById, getGuestBookings } from "../../actions";
import { apartments } from "@/data/apartments";

export const metadata: Metadata = {
  title: "Gästedetail",
};

export const dynamic = "force-dynamic";

function getApartmentName(id: string) {
  return apartments.find((a) => a.id === id)?.name ?? id;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

export default async function GuestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const guestId = params.id;
  const guest = await getGuestById(guestId);

  if (!guest) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link
          href="/admin/gaeste"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Zurück zu Gäste
        </Link>
        <p className="text-stone-500">Gast nicht gefunden.</p>
      </div>
    );
  }

  const bookings = await getGuestBookings(guest.email);
  const totalRevenue = Number(guest.total_revenue || 0);
  const totalStays = guest.total_stays || 0;
  const email = guest.email;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/gaeste"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Zurück zu Gäste
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">
          {guest.first_name} {guest.last_name}
        </h1>
        <p className="text-stone-500 text-sm mt-1">{guest.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Bookings */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">
                Buchungen ({bookings.length})
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/buchungen/${booking.id}`}
                  className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-stone-900 text-sm">
                      {getApartmentName(booking.apartment_id)}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
                      &middot; {booking.adults}E
                      {booking.children > 0 ? ` ${booking.children}K` : ""}
                      {booking.dogs > 0 ? ` ${booking.dogs}H` : ""}
                    </p>
                    {booking.notes && (
                      <p className="text-xs text-stone-400 mt-1 truncate max-w-xs">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium text-stone-900">
                      {formatCurrency(Number(booking.total_price))}
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
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900 text-sm">Statistik</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Aufenthalte
                </p>
                <p className="text-2xl font-bold text-stone-900">{totalStays}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Gesamtumsatz
                </p>
                <p className="text-2xl font-bold text-stone-900">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900 text-sm">Kontakt</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  E-Mail
                </p>
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-[#c8a96e] hover:text-[#b89555]"
                >
                  {email}
                </a>
              </div>
              {guest.phone && (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Telefon
                  </p>
                  <a
                    href={`tel:${guest.phone}`}
                    className="text-sm text-[#c8a96e] hover:text-[#b89555]"
                  >
                    {guest.phone}
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  Adresse
                </p>
                <p className="text-sm text-stone-700">
                  {guest.street}
                  <br />
                  {guest.zip} {guest.city}, {guest.country}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 space-y-2">
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                E-Mail senden
              </a>
              {guest.phone && (
                <a
                  href={`tel:${guest.phone}`}
                  className="flex items-center gap-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  Anrufen
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
