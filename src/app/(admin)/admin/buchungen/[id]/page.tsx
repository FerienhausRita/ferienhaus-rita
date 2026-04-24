import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingById, getBookingNotes, getEmailSchedule, getBookingLineItems, getSiteSetting, getBookingPayments, getGuestRatingByEmail } from "../../actions";
import { formatAdminDateTime } from "@/lib/format-datetime";
import { normalizeBankDetails } from "@/lib/bank-details";
import { getApartmentWithPricing, getTaxConfigFromDB, getAllApartmentsWithPricing } from "@/lib/pricing-data";
import BookingDetailsEditor from "@/components/admin/BookingDetailsEditor";
import BookingActions from "@/components/admin/BookingActions";
import BookingNotes from "@/components/admin/BookingNotes";
import EmailCompose from "@/components/admin/EmailCompose";
import EmailTimeline from "@/components/admin/EmailTimeline";
import InvoiceNumberEdit from "@/components/admin/InvoiceNumberEdit";
import DepositTracker from "@/components/admin/DepositTracker";
import BookingPriceEditor from "@/components/admin/BookingPriceEditor";
import GuestDataEditor from "@/components/admin/GuestDataEditor";
import { getMeldeschein } from "../../actions";

export const metadata: Metadata = {
  title: "Buchungsdetail",
};

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    weekday: "short",
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

const formatDateTime = formatAdminDateTime;

const statusConfig: Record<
  string,
  { label: string; className: string; bgClassName: string }
> = {
  pending: {
    label: "Offen",
    className: "bg-amber-100 text-amber-700",
    bgClassName: "bg-amber-50 border-amber-200",
  },
  confirmed: {
    label: "Bestätigt",
    className: "bg-emerald-100 text-emerald-700",
    bgClassName: "bg-emerald-50 border-emerald-200",
  },
  completed: {
    label: "Abgeschlossen",
    className: "bg-stone-100 text-stone-600",
    bgClassName: "bg-stone-50 border-stone-200",
  },
  cancelled: {
    label: "Storniert",
    className: "bg-red-100 text-red-700",
    bgClassName: "bg-red-50 border-red-200",
  },
};

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [booking, notes, emailSchedule, meldeschein, lineItems, bankDetails, taxConfig, payments] = await Promise.all([
    getBookingById(params.id),
    getBookingNotes(params.id),
    getEmailSchedule(params.id),
    getMeldeschein(params.id),
    getBookingLineItems(params.id),
    getSiteSetting("bank_details"),
    getTaxConfigFromDB(),
    getBookingPayments(params.id),
  ]);

  if (!booking) {
    notFound();
  }

  // Load apartment with DB overrides (name + pricing)
  const [apartmentPricing, allApartments] = await Promise.all([
    getApartmentWithPricing(booking.apartment_id),
    getAllApartmentsWithPricing(),
  ]);
  const detailApartments = allApartments.map((a) => ({
    id: a.id,
    name: a.name,
    maxGuests: a.maxGuests,
  }));
  const apartment = apartmentPricing;
  const status = statusConfig[booking.status] ?? statusConfig.pending;

  // Load admin rating from previous stays (for returning guests)
  const guestRating = await getGuestRatingByEmail(booking.email || "");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/buchungen"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Zurück zu Buchungen
      </Link>

      {/* Header – sticky beim Scrollen */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm pb-4 mb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-stone-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {booking.first_name} {booking.last_name}
            </h1>
            <p className="text-stone-500 text-sm mt-0.5">
              Buchung #{booking.id.substring(0, 8)} &middot; Erstellt am{" "}
              {formatDateTime(booking.created_at)}
            </p>
          </div>
          <span
            className={`self-start px-3 py-1.5 rounded-full text-sm font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Returning-guest banner (if rating exists) */}
      {guestRating && (guestRating.admin_rating || guestRating.admin_notes) && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <Link
                href={`/admin/gaeste/${guestRating.id}`}
                className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-amber-900 text-sm">
                  Wiederkehrender Gast
                </p>
                {guestRating.admin_rating && (
                  <span className="text-amber-400">
                    {"★".repeat(guestRating.admin_rating)}
                    <span className="text-amber-200">
                      {"★".repeat(5 - guestRating.admin_rating)}
                    </span>
                  </span>
                )}
                {guestRating.total_stays && guestRating.total_stays > 1 && (
                  <span className="text-xs text-amber-700">
                    {guestRating.total_stays} Aufenthalte
                  </span>
                )}
              </div>
              {guestRating.admin_notes && (
                <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">
                  {guestRating.admin_notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* External channel banner */}
      {booking.source_channel && booking.source_channel !== "Website" && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-sm">
                Buchung über {booking.source_channel}
              </p>
              <p className="text-xs text-blue-800 mt-0.5">
                Zahlung und Gastkommunikation laufen direkt über{" "}
                {booking.source_channel}. Es werden <strong>keine automatischen
                E-Mails</strong> versendet und keine Anzahlung berechnet.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Buchungsdetails</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Wohnung
                  </p>
                  <p className="font-medium text-stone-900">
                    {apartment?.name ?? booking.apartment_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Nächte
                  </p>
                  <p className="font-medium text-stone-900">{booking.nights}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Check-in
                  </p>
                  <p className="font-medium text-stone-900">
                    {formatDate(booking.check_in)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Check-out
                  </p>
                  <p className="font-medium text-stone-900">
                    {formatDate(booking.check_out)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Erwachsene
                  </p>
                  <p className="font-medium text-stone-900">{booking.adults}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Kinder
                  </p>
                  <p className="font-medium text-stone-900">
                    {booking.children}
                  </p>
                </div>
                {booking.dogs > 0 && (
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                      Hunde
                    </p>
                    <p className="font-medium text-stone-900">
                      {booking.dogs}
                    </p>
                  </div>
                )}
              </div>

              {booking.notes && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Anmerkungen des Gastes
                  </p>
                  <p className="text-stone-700 text-sm">{booking.notes}</p>
                </div>
              )}
            </div>
            <BookingDetailsEditor
              bookingId={booking.id}
              apartments={detailApartments}
              initialApartmentId={booking.apartment_id}
              initialCheckIn={booking.check_in}
              initialCheckOut={booking.check_out}
              initialAdults={booking.adults}
              initialChildren={booking.children || 0}
              initialDogs={booking.dogs || 0}
              initialNotes={booking.notes || ""}
              isExternalChannel={!!booking.source_channel && booking.source_channel !== "Website"}
            />
          </div>

          {/* Guest Contact – inline editable */}
          <GuestDataEditor
            bookingId={booking.id}
            firstName={booking.first_name}
            lastName={booking.last_name}
            email={booking.email || ""}
            phone={booking.phone || ""}
            street={booking.street || ""}
            zip={booking.zip || ""}
            city={booking.city || ""}
            country={booking.country || ""}
          />

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-5">
              <BookingPriceEditor
                bookingId={booking.id}
                nights={booking.nights}
                adults={booking.adults}
                children={booking.children || 0}
                dogs={booking.dogs || 0}
                baseGuests={apartmentPricing?.baseGuests ?? 2}
                pricePerNight={Number(booking.price_per_night)}
                extraGuestsTotal={Number(booking.extra_guests_total || 0)}
                dogsTotal={Number(booking.dogs_total || 0)}
                cleaningFee={Number(booking.cleaning_fee)}
                localTaxTotal={Number(booking.local_tax_total || 0)}
                discountAmount={Number(booking.discount_amount || 0)}
                totalPrice={Number(booking.total_price)}
                lineItems={lineItems.map((li: { id: string; label: string; amount: number }) => ({
                  id: li.id,
                  label: li.label,
                  amount: Number(li.amount),
                }))}
                dogFeePerNight={apartmentPricing?.dogFee ?? 15}
                extraPersonPrice={apartmentPricing?.extraPersonPrice ?? 20}
                localTaxPerNight={taxConfig.localTaxPerNight}
              />

              {/* Invoice number + download */}
              <div className="pt-4 mt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">Rechnungsnr.</span>
                  <InvoiceNumberEdit
                    bookingId={booking.id}
                    initialNumber={booking.invoice_number}
                  />
                </div>
                <a
                  href={`/api/invoice/${booking.id}`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Rechnung herunterladen
                </a>
              </div>
            </div>
          </div>

          {/* Email Timeline */}
          <EmailTimeline
            emails={emailSchedule}
            bookingId={booking.id}
          />

          {/* Email Compose */}
          <EmailCompose
            bookingId={booking.id}
            guestEmail={booking.email}
            guestName={`${booking.first_name} ${booking.last_name}`}
            guestFirstName={booking.first_name}
            bookingRef={`FR-${booking.id.slice(0, 8).toUpperCase()}`}
            totalPrice={Number(booking.total_price)}
            depositAmount={Number(booking.deposit_amount || 0)}
            remainderAmount={Number(booking.remainder_amount || 0)}
            checkIn={booking.check_in}
            checkOut={booking.check_out}
            apartmentName={apartment?.name || ""}
            bankDetails={normalizeBankDetails(bankDetails as Record<string, unknown> | null | undefined)}
          />

          {/* Internal Notes */}
          <BookingNotes
            bookingId={booking.id}
            initialNotes={notes}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Meldeschein status */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900 text-sm">Meldeschein</h2>
            </div>
            <div className="p-5">
              {meldeschein ? (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      meldeschein.status === "verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : meldeschein.status === "completed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {meldeschein.status === "verified"
                      ? "Geprüft"
                      : meldeschein.status === "completed"
                      ? "Ausgefüllt"
                      : "Ausstehend"}
                  </span>
                  <Link
                    href={`/admin/meldeschein/${booking.id}`}
                    className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
                  >
                    Ansehen
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  Noch nicht ausgefüllt
                </p>
              )}
            </div>
          </div>

          {/* AGB & Zustimmung */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900 text-sm">AGB & Zustimmung</h2>
            </div>
            <div className="p-5 space-y-3 text-xs text-stone-600">
              {booking.consent_accepted_at ? (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      Akzeptiert am{" "}
                      <span className="font-medium text-stone-900">
                        {formatAdminDateTime(booking.consent_accepted_at)}
                      </span>
                    </span>
                  </div>
                  {booking.consent_ip && (
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400">IP:</span>
                      <span className="font-mono text-stone-700">{booking.consent_ip}</span>
                    </div>
                  )}
                  {booking.terms_version && (
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400">AGB-Version:</span>
                      <span className="font-medium">{booking.terms_version}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-stone-400">Keine Zustimmung erfasst</p>
              )}
              {booking.terms_sent_at && (
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>
                    AGB zugestellt am{" "}
                    <span className="font-medium text-stone-900">
                      {formatAdminDateTime(booking.terms_sent_at)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {(!booking.source_channel || booking.source_channel === "Website") && (
          <DepositTracker
            bookingId={booking.id}
            totalPrice={Number(booking.total_price)}
            depositAmount={Number(booking.deposit_amount || 0)}
            depositDueDate={booking.deposit_due_date}
            depositPaidAt={booking.deposit_paid_at}
            remainderAmount={Number(booking.remainder_amount || 0)}
            remainderDueDate={booking.remainder_due_date}
            remainderPaidAt={booking.remainder_paid_at}
            paymentStatus={booking.payment_status}
            payments={(payments ?? []).map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              paid_at: p.paid_at,
              method: p.method,
              applies_to: (p.applies_to as "deposit" | "remainder") ?? "deposit",
              note: p.note,
            }))}
          />
          )}

          <BookingActions
            bookingId={booking.id}
            currentStatus={booking.status}
            currentPaymentStatus={booking.payment_status}
            confirmationSentAt={booking.confirmation_sent_at}
            guestEmail={booking.email}
            guestPhone={booking.phone}
          />
        </div>
      </div>
    </div>
  );
}
