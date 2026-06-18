import { Metadata } from "next";
import { apartments as staticApartments } from "@/data/apartments";
import { getApartmentNameMap } from "@/lib/pricing-data";
import { getApartmentImages } from "@/app/(admin)/admin/actions";
import PhotoManager, {
  type ApartmentPhotos,
} from "@/components/admin/PhotoManager";

export const metadata: Metadata = { title: "Fotos" };

export const dynamic = "force-dynamic";

export default async function FotosSettingsPage() {
  const nameMap = await getApartmentNameMap();

  const apartments: ApartmentPhotos[] = await Promise.all(
    staticApartments.map(async (apt) => ({
      id: apt.id,
      name: nameMap.get(apt.id) ?? apt.name,
      images: await getApartmentImages(apt.id),
      fallbackImages: apt.images,
    }))
  );

  return (
    <div>
      <p className="text-stone-500 mb-6">
        Fotos je Wohnung hochladen, löschen und per Drag-&amp;-Drop sortieren.
        Solange keine eigenen Fotos hochgeladen sind, zeigt die Website die
        Standard-Fotos.
      </p>
      <PhotoManager apartments={apartments} />
    </div>
  );
}
