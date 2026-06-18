import { Metadata } from "next";
import { apartments as staticApartments } from "@/data/apartments";
import { getApartmentNameMap } from "@/lib/pricing-data";
import { getApartmentImages } from "../actions";
import PhotoManager, {
  type ApartmentPhotos,
} from "@/components/admin/PhotoManager";

export const metadata: Metadata = { title: "Fotos" };

export const dynamic = "force-dynamic";

export default async function FotosPage() {
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Fotos</h1>
        <p className="text-stone-500 mt-1">
          Fotos je Wohnung hochladen, löschen und per Drag-&amp;-Drop sortieren.
          Solange keine eigenen Fotos hochgeladen sind, zeigt die Website die
          Standard-Fotos.
        </p>
      </header>

      <PhotoManager apartments={apartments} />
    </div>
  );
}
