import { Metadata } from "next";
import Container from "@/components/ui/Container";
import MapLoader from "@/components/map/MapLoader";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Interaktive Karte – Kals am Großglockner",
  description:
    "Entdecken Sie Restaurants, Wanderwege, Skigebiete und Sehenswürdigkeiten rund um Kals am Großglockner.",
};

export const dynamic = "force-dynamic";

export default async function KartePage() {
  const supabase = createServerClient();
  const { data: pois } = await supabase
    .from("points_of_interest")
    .select("*")
    .eq("active", true)
    .order("is_featured", { ascending: false })
    .order("name");

  return (
    <div className="pt-28 pb-24">
      <Container>
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            Unsere Empfehlungen
          </h1>
          <p className="text-stone-500 max-w-2xl">
            Restaurants, Wanderwege, Aussichtspunkte und mehr rund um Kals am Großglockner –
            unsere persönlichen Tipps für Ihren Aufenthalt.
          </p>
        </div>

        <MapLoader pois={pois || []} />
      </Container>
    </div>
  );
}
