import { Metadata } from "next";
import Container from "@/components/ui/Container";
import { createServerClient } from "@/lib/supabase/server";
import GuestGuideCategory, {
  type GuestGuideSection,
} from "@/components/guest/GuestGuideCategory";

export const metadata: Metadata = {
  title: "Gästemappe – Ferienhaus Rita",
  description:
    "Alles Wichtige für Ihren Aufenthalt im Ferienhaus Rita in Kals am Großglockner.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const dynamic = "force-dynamic";

export default async function GaestemappePublicPage() {
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
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            Gästemappe
          </h1>
          <p className="text-stone-500">
            Alles Wichtige für Ihren Aufenthalt im Ferienhaus Rita.
          </p>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, idx) => (
              <GuestGuideCategory key={idx} section={section} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500">
            <p>Die Gästemappe wird gerade vorbereitet.</p>
          </div>
        )}
      </Container>
    </div>
  );
}
