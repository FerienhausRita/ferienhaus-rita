import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import { formatDateLong } from "@/lib/pricing";
import { contact } from "@/data/contact";

export const dynamic = "force-dynamic";

export default async function AnreisePage({
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
    .select("id, check_in, check_out, apartment_id")
    .eq("id", code)
    .single();

  if (error || !booking) {
    redirect("/meine-buchung");
  }

  // --- Load checkin_info from site_settings ---
  const { data: checkinRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "checkin_info")
    .single();

  const checkinInfo = (checkinRow?.value ?? {}) as {
    directions?: string;
    key_handover?: string;
    parking?: string;
    house_rules?: string;
    contact_info?: string;
  };

  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);

  const address = `${contact.street}, ${contact.zip} ${contact.city}, ${contact.country}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        {/* Back link */}
        <Link
          href={`/meine-buchung/${code}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-alpine-600 transition-colors mb-6"
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
          Zurück zur Buchung
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-8">
          Anreise-Informationen
        </h1>

        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-stone-900">Anreise</h3>
                </div>
                <p className="text-stone-800 font-medium">
                  {formatDateLong(checkIn)}
                </p>
                <p className="text-sm text-alpine-600 font-medium mt-0.5">
                  ab 16:00 Uhr
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-stone-900">Abreise</h3>
                </div>
                <p className="text-stone-800 font-medium">
                  {formatDateLong(checkOut)}
                </p>
                <p className="text-sm text-red-600 font-medium mt-0.5">
                  bis 10:00 Uhr
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-alpine-600"
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
              Adresse
            </h3>
            <p className="text-stone-700 mb-3">
              {contact.street}
              <br />
              {contact.zip} {contact.city}
              <br />
              {contact.country}
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-alpine-600 hover:text-alpine-700 transition-colors"
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
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              In Google Maps öffnen
            </a>
          </div>

          {/* Directions */}
          {checkinInfo.directions && (
            <InfoSection title="Anfahrt" icon="route">
              {checkinInfo.directions}
            </InfoSection>
          )}

          {/* Key handover */}
          {checkinInfo.key_handover && (
            <InfoSection title="Schlüsselübergabe" icon="key">
              {checkinInfo.key_handover}
            </InfoSection>
          )}

          {/* Parking */}
          {checkinInfo.parking && (
            <InfoSection title="Parkplatz" icon="parking">
              {checkinInfo.parking}
            </InfoSection>
          )}

          {/* House rules */}
          {checkinInfo.house_rules && (
            <InfoSection title="Hausregeln" icon="rules">
              {checkinInfo.house_rules}
            </InfoSection>
          )}

          {/* Contact */}
          {checkinInfo.contact_info && (
            <InfoSection title="Kontakt" icon="phone">
              {checkinInfo.contact_info}
            </InfoSection>
          )}

          {/* Fallback contact */}
          <div className="bg-alpine-50 rounded-2xl border border-alpine-200 p-6">
            <h3 className="font-semibold text-stone-900 mb-2">
              Fragen zur Anreise?
            </h3>
            <p className="text-stone-600 text-sm mb-3">
              Wir helfen Ihnen gerne weiter.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href={contact.phoneHref}
                className="inline-flex items-center gap-1.5 text-alpine-700 font-medium hover:text-alpine-800"
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
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                {contact.phone}
              </a>
              <a
                href={contact.emailHref}
                className="inline-flex items-center gap-1.5 text-alpine-700 font-medium hover:text-alpine-800"
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
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                {contact.email}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable info section component
// ---------------------------------------------------------------------------

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    route: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 6.75V15m0 0l3-3m-3 3l-3-3M15 6.75V15m0 0l3-3m-3 3l-3-3"
      />
    ),
    key: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    ),
    parking: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
      />
    ),
    rules: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    ),
    phone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    ),
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-alpine-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {icons[icon] || icons.rules}
        </svg>
        {title}
      </h3>
      <div className="text-stone-700 text-sm whitespace-pre-line leading-relaxed">
        {children}
      </div>
    </div>
  );
}
