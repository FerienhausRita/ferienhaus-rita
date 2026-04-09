import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import MeldescheinForm from "@/components/guest/MeldescheinForm";

export const dynamic = "force-dynamic";

export default async function MeldescheinPage({
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

  // --- Check if already submitted ---
  const { data: existing } = await supabase
    .from("meldeschein")
    .select("status, completed_at")
    .eq("booking_id", code)
    .single();

  const alreadyCompleted = existing?.status === "completed" || existing?.status === "verified";

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

        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            Meldeschein
          </h1>
          <p className="text-stone-500">
            Gemäß österreichischem Meldegesetz bitten wir Sie, die Daten aller
            Reisenden vor der Ankunft auszufüllen.
          </p>
        </div>

        {alreadyCompleted ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">
              Bereits ausgefüllt
            </h3>
            <p className="text-stone-500 mb-1">
              Ihr Meldeschein wurde erfolgreich eingereicht.
            </p>
            {existing?.completed_at && (
              <p className="text-xs text-stone-400">
                Eingereicht am{" "}
                {new Date(existing.completed_at).toLocaleDateString("de-AT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
            <MeldescheinForm
              bookingId={code}
              prefill={{
                first_name: booking.first_name,
                last_name: booking.last_name,
                street: booking.street || "",
                zip: booking.zip || "",
                city: booking.city || "",
                country: booking.country || "AT",
                arrival_date: booking.check_in,
                departure_date: booking.check_out,
              }}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
