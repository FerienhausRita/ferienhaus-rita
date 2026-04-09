import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeldeschein, getBookingById } from "../../actions";
import { getApartmentById } from "@/data/apartments";
import MeldescheinVerifyButton from "@/components/admin/MeldescheinVerifyButton";

export const metadata: Metadata = {
  title: "Meldeschein",
};

export const dynamic = "force-dynamic";

const NATIONALITY_LABELS: Record<string, string> = {
  AT: "Österreich",
  DE: "Deutschland",
  CH: "Schweiz",
  IT: "Italien",
  NL: "Niederlande",
  CZ: "Tschechien",
  PL: "Polen",
  HU: "Ungarn",
  SK: "Slowakei",
  SI: "Slowenien",
  HR: "Kroatien",
  GB: "Großbritannien",
  FR: "Frankreich",
  BE: "Belgien",
  DK: "Dänemark",
  SE: "Schweden",
  US: "USA",
};

const ID_TYPE_LABELS: Record<string, string> = {
  passport: "Reisepass",
  id_card: "Personalausweis",
  drivers_license: "Führerschein",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function MeldescheinAdminPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const [meldeschein, booking] = await Promise.all([
    getMeldeschein(params.bookingId),
    getBookingById(params.bookingId),
  ]);

  if (!meldeschein || !booking) {
    notFound();
  }

  const apartment = getApartmentById(booking.apartment_id);
  const companions = (meldeschein.companions || []) as {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    nationality: string;
  }[];

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Ausstehend", className: "bg-amber-100 text-amber-700" },
    completed: { label: "Ausgefüllt", className: "bg-blue-100 text-blue-700" },
    verified: { label: "Geprüft", className: "bg-emerald-100 text-emerald-700" },
  };

  const status = statusConfig[meldeschein.status] || statusConfig.pending;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href={`/admin/buchungen/${params.bookingId}`}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Zurück zur Buchung
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Meldeschein</h1>
          <p className="text-stone-500 text-sm mt-1">
            {booking.first_name} {booking.last_name} &middot;{" "}
            {apartment?.name || booking.apartment_id} &middot;{" "}
            {formatDate(booking.check_in)} – {formatDate(booking.check_out)}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Primary guest */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Hauptgast</h2>
        </div>
        <div className="p-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Name</dt>
              <dd className="font-medium text-stone-900">{meldeschein.first_name} {meldeschein.last_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Geburtsdatum</dt>
              <dd className="font-medium text-stone-900">{formatDate(meldeschein.date_of_birth)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Staatsangehörigkeit</dt>
              <dd className="font-medium text-stone-900">{NATIONALITY_LABELS[meldeschein.nationality] || meldeschein.nationality}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Ausweisdokument</dt>
              <dd className="font-medium text-stone-900">
                {ID_TYPE_LABELS[meldeschein.id_type] || meldeschein.id_type}: {meldeschein.id_number}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Adresse</dt>
              <dd className="font-medium text-stone-900">
                {meldeschein.street}, {meldeschein.zip} {meldeschein.city}, {NATIONALITY_LABELS[meldeschein.country] || meldeschein.country}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Anreise</dt>
              <dd className="font-medium text-stone-900">{formatDate(meldeschein.arrival_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500 uppercase tracking-wider mb-1">Abreise</dt>
              <dd className="font-medium text-stone-900">{formatDate(meldeschein.departure_date)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Companions */}
      {companions.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900">
              Mitreisende ({companions.length})
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {companions.map((c, i) => (
              <div key={i} className="bg-stone-50 rounded-xl p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Name</dt>
                    <dd className="font-medium text-stone-900">{c.first_name} {c.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Geburtsdatum</dt>
                    <dd className="font-medium text-stone-900">{formatDate(c.date_of_birth)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Nationalität</dt>
                    <dd className="font-medium text-stone-900">{NATIONALITY_LABELS[c.nationality] || c.nationality}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {meldeschein.status !== "verified" && (
          <MeldescheinVerifyButton bookingId={params.bookingId} />
        )}
        <a
          href={`/api/meldeschein/${params.bookingId}/pdf`}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          PDF herunterladen
        </a>
      </div>
    </div>
  );
}
