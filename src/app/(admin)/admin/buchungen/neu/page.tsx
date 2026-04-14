import { Metadata } from "next";
import Link from "next/link";
import {
  getAllApartmentsWithPricing,
  getSeasonConfigsFromDB,
  getSeasonPeriodsFromDB,
  getTaxConfigFromDB,
} from "@/lib/pricing-data";
import ManualBookingForm from "@/components/admin/ManualBookingForm";

export const metadata: Metadata = { title: "Neue Buchung" };
export const dynamic = "force-dynamic";

export default async function NeueBuchungPage() {
  const [apartments, seasonConfigs, seasonPeriods, taxConfig] =
    await Promise.all([
      getAllApartmentsWithPricing(),
      getSeasonConfigsFromDB(),
      getSeasonPeriodsFromDB(),
      getTaxConfigFromDB(),
    ]);

  const aptData = apartments.map((a) => ({
    id: a.id,
    name: a.name,
    maxGuests: a.maxGuests,
    baseGuests: a.baseGuests,
    basePrice: a.basePrice,
    summerPrice: a.summerPrice,
    winterPrice: a.winterPrice,
    extraPersonPrice: a.extraPersonPrice,
    cleaningFee: a.cleaningFee,
    dogFee: a.dogFee,
    minNightsSummer: a.minNightsSummer,
    minNightsWinter: a.minNightsWinter,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/admin/buchungen"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Zurück zu Buchungen
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-6">Neue Buchung</h1>

      <ManualBookingForm
        apartments={aptData}
        seasonConfigs={seasonConfigs}
        seasonPeriods={seasonPeriods}
        taxConfig={taxConfig}
      />
    </div>
  );
}
