import { Metadata } from "next";
import Link from "next/link";
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
        <div className="mt-10 text-center">
          <Link
            href="/preise"
            className="inline-flex items-center gap-2 text-[var(--color-gold)] hover:text-[#b89555] text-sm font-medium underline underline-offset-4"
          >
            Alle Preise transparent ansehen
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
        <p className="text-xs text-stone-400 mt-4 text-center">
          * Alle Preise inkl. 10% MwSt. Ortstaxe wird zusätzlich erhoben.{" "}
          <a href="/agb" className="text-alpine-600 hover:text-alpine-700 underline">
            Buchungsbedingungen
          </a>
        </p>
      </Container>
    </div>
  );
}
