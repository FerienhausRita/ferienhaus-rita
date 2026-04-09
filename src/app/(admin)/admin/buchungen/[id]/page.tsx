import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingById, getBookingNotes, getEmailSchedule } from "../../actions";
import { getApartmentById } from "@/data/apartments";
import BookingActions from "@/components/admin/BookingActions";
import BookingNotes from "@/components/admin/BookingNotes";
import EmailCompose from "@/components/admin/EmailCompose";
import EmailTimeline from "@/components/admin/EmailTimeline";
import InvoiceNumberEdit from "@/components/admin/InvoiceNumberEdit";
import DepositTracker from "@/components/admin/DepositTracker";
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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [booking, notes, emailSchedule, meldeschein] = await Promise.all([
    getBookingById(params.id),
    getBookingNotes(params.id),
    getEmailSchedule(params.id),
    getMeldeschein(params.id),
  ]);

  if (!booking) {
    notFound();
  }

  const apartment = getApartmentById(booking.apartment_id);
  const status = statusConfig[booking.status] ?? statusConfig.pending;

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {booking.first_name} {booking.last_name}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
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
          </div>

          {/* Guest Contact */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Gästedaten</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Name
                  </p>
                  <p className="font-medium text-stone-900">
                    {booking.first_name} {booking.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    E-Mail
                  </p>
                  <a
                    href={`mailto:${booking.email}`}
                    className="font-medium text-[#c8a96e] hover:text-[#b89555] text-sm"
                  >
                    {booking.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Telefon
                  </p>
                  <a
                    href={`tel:${booking.phone}`}
                    className="font-medium text-[#c8a96e] hover:text-[#b89555] text-sm"
                  >
                    {booking.phone}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                    Adresse
                  </p>
                  <p className="text-stone-900 text-sm">
                    {booking.street}
                    <br />
                    {booking.zip} {booking.city}, {booking.country}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">
                Preisaufschlüsselung
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">
                    {booking.nights} Nächte &times;{" "}
                    {formatCurrency(Number(booking.price_per_night))}
                  </span>
                  <span className="text-stone-900">
                    {formatCurrency(
                      Number(booking.price_per_night) * booking.nights
                    )}
                  </span>
                </div>
                {Number(booking.extra_guests_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Zusatzgäste</span>
                    <span className="text-stone-900">
                      {formatCurrency(Number(booking.extra_guests_total))}
                    </span>
                  </div>
                )}
                {Number(booking.dogs_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Hunde</span>
                    <span className="text-stone-900">
                      {formatCurrency(Number(booking.dogs_total))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-600">Endreinigung</span>
                  <span className="text-stone-900">
                    {formatCurrency(Number(booking.cleaning_fee))}
                  </span>
                </div>
                {Number(booking.local_tax_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Ortstaxe</span>
                    <span className="text-stone-900">
                      {formatCurrency(Number(booking.local_tax_total))}
                    </span>
                  </div>
                )}
                {Number(booking.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>
                      Rabatt{" "}
                      {booking.discount_code && `(${booking.discount_code})`}
                    </span>
                    <span>
                      -{formatCurrency(Number(booking.discount_amount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-stone-200 font-bold text-base">
                  <span className="text-stone-900">Gesamt</span>
                  <span className="text-stone-900">
                    {formatCurrency(Number(booking.total_price))}
                  </span>
                </div>
              </div>

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
          />

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
