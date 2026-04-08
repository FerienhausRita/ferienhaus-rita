import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import { formatCurrency, formatDate } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    paid: {
      label: "Bezahlt",
      classes: "bg-green-100 text-green-800 border-green-200",
    },
    partial: {
      label: "Teilweise bezahlt",
      classes: "bg-amber-100 text-amber-800 border-amber-200",
    },
    pending: {
      label: "Ausstehend",
      classes: "bg-red-100 text-red-800 border-red-200",
    },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${c.classes}`}
    >
      {c.label}
    </span>
  );
}

export default async function BookingOverviewPage({
  params,
}: {
  params: { code: string };
}) {
  const { code } = params;

  // --- Auth check ---
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("guest_token")?.value;

  if (!tokenCookie) {
    redirect("/meine-buchung");
  }

  const tokenData = verifyGuestToken(tokenCookie);
  if (!tokenData || tokenData.bookingId !== code) {
    redirect("/meine-buchung");
  }

  // --- Load booking ---
  const supabase = createServerClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", code)
    .single();

  if (error || !booking) {
    redirect("/meine-buchung");
  }

  // --- Load apartment ---
  const apartment = getApartmentById(booking.apartment_id);
  if (!apartment) {
    redirect("/meine-buchung");
  }

  // --- Load bank details ---
  const { data: bankRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "bank_details")
    .single();

  const bankDetails = bankRow?.value as {
    iban?: string;
    bic?: string;
    account_holder?: string;
    bank_name?: string;
  } | null;

  // --- Derived data ---
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isPaid = booking.payment_status === "paid";

  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/meine-buchung"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-alpine-600 transition-colors mb-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Zurück
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Ihre Buchung
          </h1>
        </div>

        {/* Apartment Card */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm mb-6">
          <div className="sm:flex">
            <div className="sm:w-64 h-48 sm:h-auto relative flex-shrink-0">
              <Image
                src={apartment.images[0]}
                alt={apartment.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 flex-1">
              <h2 className="font-serif text-xl font-bold text-stone-900 mb-1">
                {apartment.name}
              </h2>
              <p className="text-stone-500 text-sm mb-4">
                {apartment.subtitle}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-400">Check-in</span>
                  <p className="font-medium text-stone-800">
                    {formatDate(checkIn)}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400">Check-out</span>
                  <p className="font-medium text-stone-800">
                    {formatDate(checkOut)}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400">Nächte</span>
                  <p className="font-medium text-stone-800">{nights}</p>
                </div>
                <div>
                  <span className="text-stone-400">Gäste</span>
                  <p className="font-medium text-stone-800">
                    {booking.adults} Erw.
                    {booking.children > 0 &&
                      `, ${booking.children} Kind${booking.children > 1 ? "er" : ""}`}
                    {booking.dogs > 0 &&
                      `, ${booking.dogs} Hund${booking.dogs > 1 ? "e" : ""}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price & Payment */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-900">Zahlung</h3>
            <PaymentBadge status={booking.payment_status || "pending"} />
          </div>

          <div className="border-t border-stone-100 pt-4">
            <div className="flex justify-between items-center text-lg font-semibold text-stone-900">
              <span>Gesamtpreis</span>
              <span>{formatCurrency(booking.total_price)}</span>
            </div>
          </div>

          {/* Bank details if not fully paid */}
          {!isPaid && bankDetails?.iban && (
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">
                Bankverbindung
              </h4>
              <dl className="text-sm space-y-1.5">
                {bankDetails.account_holder && (
                  <div className="flex justify-between">
                    <dt className="text-amber-700">Kontoinhaber</dt>
                    <dd className="font-medium text-amber-900">
                      {bankDetails.account_holder}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-amber-700">IBAN</dt>
                  <dd className="font-medium text-amber-900 font-mono text-xs">
                    {bankDetails.iban}
                  </dd>
                </div>
                {bankDetails.bic && (
                  <div className="flex justify-between">
                    <dt className="text-amber-700">BIC</dt>
                    <dd className="font-medium text-amber-900 font-mono text-xs">
                      {bankDetails.bic}
                    </dd>
                  </div>
                )}
                {bankDetails.bank_name && (
                  <div className="flex justify-between">
                    <dt className="text-amber-700">Bank</dt>
                    <dd className="font-medium text-amber-900">
                      {bankDetails.bank_name}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs text-amber-700">Verwendungszweck:</p>
                <p className="font-mono text-sm font-semibold text-amber-900 mt-0.5">
                  {booking.invoice_number || booking.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Guest info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-stone-900 mb-4">Gastdaten</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-stone-400">Name</dt>
              <dd className="font-medium text-stone-800">
                {booking.first_name} {booking.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400">E-Mail</dt>
              <dd className="font-medium text-stone-800">{booking.email}</dd>
            </div>
            {booking.phone && (
              <div>
                <dt className="text-stone-400">Telefon</dt>
                <dd className="font-medium text-stone-800">{booking.phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-stone-400">Adresse</dt>
              <dd className="font-medium text-stone-800">
                {booking.street}, {booking.zip} {booking.city}
                {booking.country && `, ${booking.country}`}
              </dd>
            </div>
          </dl>
        </div>

        {/* Action links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/meine-buchung/${code}/anreise`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-alpine-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0 group-hover:bg-alpine-200 transition-colors">
              <svg
                className="w-6 h-6 text-alpine-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-900">
                Check-in Informationen
              </p>
              <p className="text-sm text-stone-500">
                Anreise, Adresse & Hausregeln
              </p>
            </div>
          </Link>

          <Link
            href={`/meine-buchung/${code}/rechnung`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-alpine-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0 group-hover:bg-alpine-200 transition-colors">
              <svg
                className="w-6 h-6 text-alpine-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-900">
                Rechnung herunterladen
              </p>
              <p className="text-sm text-stone-500">PDF-Rechnung speichern</p>
            </div>
          </Link>
        </div>
      </Container>
    </div>
  );
}
