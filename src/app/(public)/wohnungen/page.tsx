import { Metadata } from "next";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import ApartmentCard from "@/components/apartments/ApartmentCard";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Unsere Wohnungen",
  description:
    "Vier liebevoll eingerichtete Ferienwohnungen in Kals am Großglockner – von 40 m² bis 96 m² für 2 bis 6 Personen.",
};

export const dynamic = "force-dynamic";

export default async function WohnungenPage() {
  const apartments = await getAllApartmentsWithPricing();

  return (
    <div className="pt-28 pb-24">
      <Container>
        <SectionHeading
          title="Unsere Wohnungen"
          subtitle="Vier individuell eingerichtete Ferienwohnungen – von der gemütlichen Auszeit für Zwei bis zum großzügigen Familiendomizil."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {apartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      </Container>
    </div>
  );
}
