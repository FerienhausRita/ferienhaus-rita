import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { verifyGuestToken } from "@/lib/guest-auth";
import { createServerClient } from "@/lib/supabase/server";
import GuestGuideCategory, {
  type GuestGuideSection,
} from "@/components/guest/GuestGuideCategory";

export const dynamic = "force-dynamic";

export default async function GaestemappePage({
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

  // --- Load guest guide from site_settings ---
  const supabase = createServerClient();
  const { data: guideRow } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "guest_guide")
    .single();

  const sections: GuestGuideSection[] = (guideRow?.value as GuestGuideSection[]) || [];

  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/meine-buchung/${code}`}
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
            Zurück zur Buchung
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            Gästemappe
          </h1>
          <p className="text-stone-500">
            Alles Wichtige für Ihren Aufenthalt im Ferienhaus Rita.
          </p>
        </div>

        {/* Categories */}
        {sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <GuestGuideCategory key={idx} section={section} />
            ))}
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center">
            <svg
              className="w-12 h-12 text-stone-300 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <p className="text-stone-500">
              Die Gästemappe wird gerade vorbereitet.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
