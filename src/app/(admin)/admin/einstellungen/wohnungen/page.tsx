import { Metadata } from "next";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import ApartmentContentEditor, {
  type ApartmentContentData,
} from "@/components/admin/ApartmentContentEditor";

export const metadata: Metadata = { title: "Wohnungen" };

export const dynamic = "force-dynamic";

export default async function WohnungenSettingsPage() {
  const apartments = await getAllApartmentsWithPricing();

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
    <div>
      <p className="text-stone-500 mb-6">
        Inhalte der Wohnungs-Detailseiten bearbeiten: Texte, Eckdaten, Features,
        Highlights und Ausstattung. Änderungen erscheinen sofort auf der Website.
      </p>
      <ApartmentContentEditor apartments={data} />
    </div>
  );
}
