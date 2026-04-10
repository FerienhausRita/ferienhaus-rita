import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentById } from "@/data/apartments";
import { formatCurrency, formatDate } from "@/lib/pricing";
import WeatherWidget from "@/components/guest/WeatherWidget";
import RebookButton from "@/components/guest/RebookButton";
import ChatSection from "@/components/guest/ChatSection";

export const dynamic = "force-dynamic";

function BookingStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pending: {
      label: "Anfrage – wird geprüft",
      classes: "bg-amber-100 text-amber-800 border-amber-200",
    },
    confirmed: {
      label: "Bestätigt",
      classes: "bg-green-100 text-green-800 border-green-200",
    },
    cancelled: {
      label: "Storniert",
      classes: "bg-red-100 text-red-800 border-red-200",
    },
    completed: {
      label: "Abgeschlossen",
      classes: "bg-stone-100 text-stone-700 border-stone-200",
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

  // --- Load meldeschein status ---
  const { data: meldeschein } = await supabase
    .from("meldeschein")
    .select("status")
    .eq("booking_id", code)
    .single();

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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
              {booking.status === "pending" ? "Ihre Anfrage" : "Ihre Buchung"}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
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

        {/* Price & Payment – only shown when confirmed/completed */}
        {(booking.status === "confirmed" || booking.status === "completed") && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Zahlung</h3>
              <PaymentBadge status={booking.payment_status || "pending"} />
            </div>

            {/* Full price breakdown */}
            <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">{nights} x Übernachtung</span>
                <span className="font-medium text-stone-900">
                  {formatCurrency(Number(booking.price_per_night || 0) * nights)}
                </span>
              </div>
              {Number(booking.extra_guests_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Zusatzgäste</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(Number(booking.extra_guests_total))}
                  </span>
                </div>
              )}
              {Number(booking.dogs_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Hund(e)</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(Number(booking.dogs_total))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Endreinigung</span>
                <span className="font-medium text-stone-900">
                  {formatCurrency(Number(booking.cleaning_fee || 0))}
                </span>
              </div>
              {Number(booking.local_tax_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Ortstaxe</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(Number(booking.local_tax_total))}
                  </span>
                </div>
              )}
              {Number(booking.discount_amount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Rabatt</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(Number(booking.discount_amount))}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-lg font-semibold text-stone-900 pt-3 border-t border-stone-200">
                <span>Gesamtpreis</span>
                <span>{formatCurrency(Number(booking.total_price || 0))}</span>
              </div>
            </div>

            {/* Deposit / Remainder details */}
            {Number(booking.deposit_amount || 0) > 0 && Number(booking.remainder_amount || 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">
                    Anzahlung (30%)
                    {booking.deposit_paid_at && <span className="ml-1 text-emerald-600">&#10003;</span>}
                  </span>
                  <span className={`font-medium ${booking.deposit_paid_at ? "text-emerald-600" : "text-stone-900"}`}>
                    {formatCurrency(Number(booking.deposit_amount))}
                  </span>
                </div>
                {booking.deposit_due_date && !booking.deposit_paid_at && (
                  <p className="text-xs text-stone-400">Fällig bis {formatDate(new Date(booking.deposit_due_date))}</p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">
                    Restbetrag
                    {booking.remainder_paid_at && <span className="ml-1 text-emerald-600">&#10003;</span>}
                  </span>
                  <span className={`font-medium ${booking.remainder_paid_at ? "text-emerald-600" : "text-stone-900"}`}>
                    {formatCurrency(Number(booking.remainder_amount))}
                  </span>
                </div>
                {booking.remainder_due_date && !booking.remainder_paid_at && (
                  <p className="text-xs text-stone-400">Fällig bis {formatDate(new Date(booking.remainder_due_date))}</p>
                )}
              </div>
            )}

            {/* Bank details only when confirmed and not fully paid */}
            {booking.status === "confirmed" && !isPaid && bankDetails?.iban && (
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
        )}

        {/* Pending info banner */}
        {booking.status === "pending" && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 shadow-sm mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Ihre Anfrage wird geprüft</h3>
                <p className="text-sm text-amber-700">
                  Wir prüfen Ihre Buchungsanfrage und melden uns innerhalb von 24 Stunden bei Ihnen.
                  Zahlungsinformationen erhalten Sie nach der Bestätigung.
                </p>
              </div>
            </div>
          </div>
        )}

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
          {/* Meldeschein */}
          <Link
            href={`/meine-buchung/${code}/meldeschein`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-alpine-300 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              meldeschein?.status === "completed" || meldeschein?.status === "verified"
                ? "bg-emerald-100 group-hover:bg-emerald-200"
                : "bg-amber-100 group-hover:bg-amber-200"
            }`}>
              {meldeschein?.status === "completed" || meldeschein?.status === "verified" ? (
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-stone-900">Meldeschein</p>
              <p className="text-sm text-stone-500">
                {meldeschein?.status === "completed" || meldeschein?.status === "verified"
                  ? "Bereits ausgefüllt"
                  : "Gästedaten eintragen"}
              </p>
            </div>
          </Link>

          {/* Check-in Info */}
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

          {(booking.status === "confirmed" || booking.status === "completed") ? (
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
          ) : (
            <div className="flex items-center gap-4 bg-stone-50 rounded-2xl border border-stone-200 p-5">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-stone-400"
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
                <p className="font-semibold text-stone-500">Rechnung</p>
                <p className="text-sm text-stone-400">
                  Wird nach Bestätigung Ihrer Anfrage verfügbar.
                </p>
              </div>
            </div>
          )}

          {/* Gästemappe */}
          <Link
            href={`/meine-buchung/${code}/gaestemappe`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-alpine-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#c8a96e]/20 transition-colors">
              <svg
                className="w-6 h-6 text-[#c8a96e]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-900">Gästemappe</p>
              <p className="text-sm text-stone-500">
                WLAN, Hausregeln, Tipps & mehr
              </p>
            </div>
          </Link>

          {/* AGB & Hausregeln */}
          <Link
            href="/agb"
            className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:border-alpine-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 group-hover:bg-stone-200 transition-colors">
              <svg
                className="w-6 h-6 text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-900">
                Buchungsbedingungen & Hausregeln
              </p>
              <p className="text-sm text-stone-500">AGB, Storno & Hausordnung</p>
            </div>
          </Link>
        </div>

        {/* Weather Widget – only for confirmed/completed */}
        {(booking.status === "confirmed" || booking.status === "completed") && (
          <div className="mt-6">
            <Suspense fallback={null}>
              <WeatherWidget />
            </Suspense>
          </div>
        )}

        {/* Chat – for confirmed/completed bookings */}
        {(booking.status === "confirmed" || booking.status === "completed") && (
          <div className="mt-6">
            <ChatSection bookingId={code} />
          </div>
        )}

        {/* Rebook CTA – only for completed bookings */}
        {booking.status === "completed" && apartment && (
          <div className="mt-6">
            <RebookButton apartmentSlug={apartment.slug} />
          </div>
        )}
      </Container>
    </div>
  );
}
