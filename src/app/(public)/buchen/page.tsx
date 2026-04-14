import { Metadata } from "next";
import { Suspense } from "react";
import { getAllPricingData } from "@/lib/pricing-data";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Buchen",
  description:
    "Prüfen Sie die Verfügbarkeit und buchen Sie Ihre Ferienwohnung in Kals am Großglockner direkt beim Gastgeber.",
};

export const dynamic = "force-dynamic";

export default async function BuchenPage() {
  const pricingData = await getAllPricingData();

  // Serialize for client component
  const serializedApartments = pricingData.apartments.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    subtitle: a.subtitle,
    description: a.description,
    shortDescription: a.shortDescription,
    size: a.size,
    maxGuests: a.maxGuests,
    baseGuests: a.baseGuests,
    bedrooms: a.bedrooms,
    bathrooms: a.bathrooms,
    floor: a.floor,
    basePrice: a.basePrice,
    summerPrice: a.summerPrice,
    winterPrice: a.winterPrice,
    extraPersonPrice: a.extraPersonPrice,
    cleaningFee: a.cleaningFee,
    dogFee: a.dogFee,
    minNightsSummer: a.minNightsSummer,
    minNightsWinter: a.minNightsWinter,
    features: a.features,
    highlights: a.highlights,
    amenities: a.amenities,
    images: a.images,
    available: a.available,
  }));

  const serializedSeasonPeriods = pricingData.seasonPeriods.map((p) => ({
    start: p.start,
    end: p.end,
    type: p.type,
    label: p.label,
  }));

  const serializedSpecialPeriods = pricingData.specialPeriods.map((sp) => ({
    label: sp.label,
    startMmdd: sp.startMmdd,
    endMmdd: sp.endMmdd,
    surchargePercent: sp.surchargePercent,
    minNights: sp.minNights,
    active: sp.active,
  }));

  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-24 min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-stone-400">Laden...</div>
        </div>
      }
    >
      <BookingFlow
        apartmentsData={serializedApartments}
        seasonConfigsData={pricingData.seasonConfigs}
        seasonPeriodsData={serializedSeasonPeriods}
        specialPeriodsData={serializedSpecialPeriods}
        taxConfigData={pricingData.taxConfig}
      />
    </Suspense>
  );
}
