import { Metadata } from "next";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import ApartmentContentEditor, {
  type ApartmentContentData,
} from "@/components/admin/ApartmentContentEditor";

export const metadata: Metadata = { title: "Wohnungen" };

export const dynamic = "force-dynamic";

export default async function WohnungenPage() {
  const apartments = await getAllApartmentsWithPricing();

  // Aktuelle (effektive) Werte je Wohnung an den Editor übergeben.
  const data: ApartmentContentData[] = apartments.map((a) => ({
    id: a.id,
    name: a.name,
    subtitle: a.subtitle,
    description: a.description,
    shortDescription: a.shortDescription,
    floor: a.floor,
    size: a.size,
    bedrooms: a.bedrooms,
    bathrooms: a.bathrooms,
    maxGuests: a.maxGuests,
    baseGuests: a.baseGuests,
    available: a.available,
    features: a.features,
    highlights: a.highlights,
    amenities: a.amenities,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Wohnungen</h1>
        <p className="text-stone-500 mt-1">
          Inhalte der Wohnungs-Detailseiten bearbeiten: Texte, Eckdaten, Features,
          Highlights und Ausstattung. Änderungen erscheinen sofort auf der Website.
          Fotos verwaltest du unter „Fotos".
        </p>
      </header>

      <ApartmentContentEditor apartments={data} />
    </div>
  );
}
