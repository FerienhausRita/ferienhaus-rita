import { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import POIManager from "@/components/admin/POIManager";

export const metadata: Metadata = {
  title: "Karte & Orte",
};

export const dynamic = "force-dynamic";

export default async function KarteAdminPage() {
  const supabase = createServerClient();
  const { data: pois } = await supabase
    .from("points_of_interest")
    .select("*")
    .order("name");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Karte & Orte</h1>
        <p className="text-sm text-stone-500 mt-1">
          Empfehlungen verwalten, die auf der interaktiven Karte angezeigt werden.
        </p>
      </div>
      <POIManager initialPois={pois || []} />
    </div>
  );
}
