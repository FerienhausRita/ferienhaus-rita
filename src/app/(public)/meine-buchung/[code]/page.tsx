import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentWithPricing, getTaxConfigFromDB } from "@/lib/pricing-data";
import { formatCurrency, formatDate } from "@/lib/pricing";
import LocalTaxHint from "@/components/booking/LocalTaxHint";
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
  const apartment = await getApartmentWithPricing(booking.apartment_id);
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

  // --- Load deposit config for dynamic percent display ---
  const { data: depositCfgRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "deposit_config")
    .single();
  const depositPercent = Number(
    (depositCfgRow?.value as { deposit_percent?: number } | null)?.deposit_percent ?? 30
  );
  const remainderPercent = 100 - depositPercent;

  // --- Load current tax config for Kurtaxe hint ---
  const taxConfig = await getTaxConfigFromDB();

  // --- Chat gating: only from check-in date onwards ---
  const todayIso = new Date().toISOString().split("T")[0];
  const chatAvailable =
    (booking.status === "confirmed" || booking.status === "completed") &&
    booking.check_in <= todayIso;

  // --- Detail rows for price breakdown (with formula strings) ---
  const pricePerNight = Number(booking.price_per_night || 0);
  const extraGuests = Math.max(
    0,
    (Number(booking.adults || 0) + Number(booking.children || 0)) -
      (apartment.baseGuests ?? 2)
  );
  const extraGuestsTotal = Number(booking.extra_guests_total || 0);
  const dogsTotal = Number(booking.dogs_total || 0);
  const localTaxTotal = Number(booking.local_tax_total || 0);
  const localTaxPerNightPerAdult =
    Number(booking.adults || 0) > 0 && nights > 0
      ? Math.round(
          (localTaxTotal / (Number(booking.adults) * nights)) * 100
        ) / 100
      : 0;
  const extraPersonPrice =
    extraGuests > 0 && nights > 0
      ? Math.round((extraGuestsTotal / (extraGuests * nights)) * 100) / 100
      : 0;
  const dogFeePerNight =
    Number(booking.dogs || 0) > 0 && nights > 0
      ? Math.round((dogsTotal / (Number(booking.dogs) * nights)) * 100) / 100
      : 0;

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

            {/* Full price breakdown with formulas */}
            <div className="border-t border-stone-100 pt-4 space-y-3 text-sm">
              {/* Übernachtungen */}
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="text-stone-700">Übernachtungen</p>
                  <p className="text-xs text-stone-400">
                    {nights} {nights === 1 ? "Nacht" : "Nächte"} &times;{" "}
                    {formatCurrency(pricePerNight)}/Nacht
                  </p>
                </div>
                <span className="font-medium text-stone-900 whitespace-nowrap">
                  {formatCurrency(pricePerNight * nights)}
                </span>
              </div>

              {/* Zusatzgäste */}
              {extraGuestsTotal > 0 && extraGuests > 0 && (
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-stone-700">
                      Zusatzgäste ({extraGuests} {extraGuests === 1 ? "Person" : "Personen"})
                    </p>
                    <p className="text-xs text-stone-400">
                      {extraGuests} &times; {formatCurrency(extraPersonPrice)}/Nacht &times;{" "}
                      {nights} Nächte
                    </p>
                  </div>
                  <span className="font-medium text-stone-900 whitespace-nowrap">
                    {formatCurrency(extraGuestsTotal)}
                  </span>
                </div>
              )}

              {/* Hunde */}
              {dogsTotal > 0 && Number(booking.dogs) > 0 && (
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-stone-700">
                      {Number(booking.dogs)} {Number(booking.dogs) === 1 ? "Hund" : "Hunde"}
                    </p>
                    <p className="text-xs text-stone-400">
                      {Number(booking.dogs)} &times; {formatCurrency(dogFeePerNight)}/Nacht &times;{" "}
                      {nights} Nächte
                    </p>
                  </div>
                  <span className="font-medium text-stone-900 whitespace-nowrap">
                    {formatCurrency(dogsTotal)}
                  </span>
                </div>
              )}

              {/* Endreinigung */}
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="text-stone-700">Endreinigung</p>
                  <p className="text-xs text-stone-400">einmalig pauschal</p>
                </div>
                <span className="font-medium text-stone-900 whitespace-nowrap">
                  {formatCurrency(Number(booking.cleaning_fee || 0))}
                </span>
              </div>

              {/* Legacy: Altbuchungen hatten Kurtaxe im Gesamtpreis */}
              {localTaxTotal > 0 && (
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-stone-700">Kurtaxe</p>
                    <p className="text-xs text-stone-400">
                      {Number(booking.adults)} Erw. &times;{" "}
                      {formatCurrency(localTaxPerNightPerAdult)}/Nacht &times;{" "}
                      {nights} Nächte
                    </p>
                  </div>
                  <span className="font-medium text-stone-900 whitespace-nowrap">
                    {formatCurrency(localTaxTotal)}
                  </span>
                </div>
              )}

              {/* Rabatt */}
              {Number(booking.discount_amount || 0) > 0 && (
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-stone-700">
                      Rabatt{booking.discount_code ? ` (${booking.discount_code})` : ""}
                    </p>
                  </div>
                  <span className="font-medium text-red-600 whitespace-nowrap">
                    -{formatCurrency(Number(booking.discount_amount))}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-lg font-semibold text-stone-900 pt-3 border-t border-stone-200">
                <span>Gesamtpreis</span>
                <span>{formatCurrency(Number(booking.total_price || 0))}</span>
              </div>
              <p className="text-[11px] text-stone-400 text-right">
                Alle Preise inkl. 10 % MwSt.
              </p>

              {/* Kurtaxe-Hinweis bei neuen Buchungen (nicht included) */}
              {!taxConfig.localTaxIncluded && taxConfig.localTaxPerNight > 0 && (
                <div className="mt-3">
                  <LocalTaxHint
                    rate={taxConfig.localTaxPerNight}
                    exemptAge={taxConfig.localTaxExemptAge}
                    variant="default"
                    estimate={
                      Math.round(
                        Number(booking.adults || 0) *
                          nights *
                          taxConfig.localTaxPerNight *
                          100
                      ) / 100
                    }
                  />
                </div>
              )}
            </div>

            {/* Deposit / Remainder details */}
            {Number(booking.deposit_amount || 0) > 0 && Number(booking.remainder_amount || 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">
                    Anzahlung ({depositPercent}%)
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
                    Restbetrag ({remainderPercent}%)
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

          {/* Invoice: sent by email only (no portal download) */}
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
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-700">Rechnung</p>
              <p className="text-sm text-stone-500">
                Wird per E-Mail zugesandt.
              </p>
            </div>
          </div>

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

        {/* Chat – only from check-in day onwards */}
        {chatAvailable && (
          <div className="mt-6">
            <ChatSection bookingId={code} />
          </div>
        )}

        {/* Chat hint when confirmed but before check-in */}
        {!chatAvailable &&
          (booking.status === "confirmed" || booking.status === "completed") && (
            <div className="mt-6 bg-stone-50 rounded-2xl border border-stone-200 p-5">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-stone-700">Chat mit dem Gastgeber</p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Der Chat wird ab Ihrem Anreisetag ({formatDate(checkIn)}) verfügbar.
                    Haben Sie vorher Fragen? Schreiben Sie uns gerne per{" "}
                    <a
                      href="/kontakt"
                      className="text-[#c8a96e] underline underline-offset-2"
                    >
                      E-Mail
                    </a>
                    .
                  </p>
                </div>
              </div>
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
