import { Metadata } from "next";
import { getDiscountCodes, getSeasonPeriods } from "../actions";
import {
  getAllApartmentsWithPricing,
  getSeasonConfigsFromDB,
  getTaxConfigFromDB,
} from "@/lib/pricing-data";
import { createServerClient } from "@/lib/supabase/server";
import DiscountManager from "@/components/admin/DiscountManager";
import PricingEditor from "@/components/admin/PricingEditor";
import PriceSimulator from "@/components/admin/PriceSimulator";

export const metadata: Metadata = {
  title: "Preise & Rabatte",
};

export const dynamic = "force-dynamic";

export default async function PreisePage() {
  const [discountCodes, allApartments, seasonConfigsMap, taxConfig, seasonPeriodsRaw] =
    await Promise.all([
      getDiscountCodes(),
      getAllApartmentsWithPricing(),
      getSeasonConfigsFromDB(),
      getTaxConfigFromDB(),
      getSeasonPeriods(),
    ]);

  // Get raw DB pricing rows for the editor
  const supabase = createServerClient();
  const { data: pricingRows } = await supabase
    .from("apartment_pricing")
    .select("*");

  // Build editor-friendly apartment data from DB rows, falling back to static
  const pricingMap = new Map(
    (pricingRows ?? []).map((r: Record<string, unknown>) => [r.apartment_id, r])
  );
  const editorApartments = allApartments.map((a) => {
    const dbRow = pricingMap.get(a.id) as
      | { base_price: number; extra_person_price: number; cleaning_fee: number; dog_fee: number }
      | undefined;
    return {
      id: a.id,
      name: a.name,
      base_price: dbRow ? Number(dbRow.base_price) : a.basePrice,
      extra_person_price: dbRow
        ? Number(dbRow.extra_person_price)
        : a.extraPersonPrice,
      cleaning_fee: dbRow ? Number(dbRow.cleaning_fee) : a.cleaningFee,
      dog_fee: dbRow ? Number(dbRow.dog_fee) : a.dogFee,
    };
  });

  // Season configs as array for editor
  const editorSeasonConfigs = Object.values(seasonConfigsMap).map((s) => ({
    type: s.type,
    label: s.label,
    multiplier: s.multiplier,
    min_nights: s.minNights,
  }));

  // Season periods with DB IDs for editor
  const editorSeasonPeriods = (seasonPeriodsRaw ?? []).map(
    (p: { id: string; type: string; start_mmdd: string; end_mmdd: string; label: string }) => ({
      id: p.id,
      type: p.type,
      start_mmdd: p.start_mmdd,
      end_mmdd: p.end_mmdd,
      label: p.label,
    })
  );

  // Simulator props
  const simulatorApartments = allApartments.map((a) => ({
    id: a.id,
    name: a.name,
    basePrice: a.basePrice,
    extraPersonPrice: a.extraPersonPrice,
    cleaningFee: a.cleaningFee,
    dogFee: a.dogFee,
    baseGuests: a.baseGuests,
    maxGuests: a.maxGuests,
  }));

  const simulatorSeasons = Object.values(seasonConfigsMap).map((s) => ({
    type: s.type,
    label: s.label,
    multiplier: s.multiplier,
    minNights: s.minNights,
  }));

  const simulatorPeriods = editorSeasonPeriods.map((p) => ({
    start: p.start_mmdd,
    end: p.end_mmdd,
    type: p.type,
    label: p.label,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Preise & Rabatte</h1>

      {/* Pricing Editor */}
      <PricingEditor
        apartments={editorApartments}
        seasonConfigs={editorSeasonConfigs}
        seasonPeriods={editorSeasonPeriods}
        taxConfig={taxConfig}
      />

      {/* Discount Code Manager */}
      <DiscountManager initialCodes={discountCodes} />

      {/* Price Simulator */}
      <PriceSimulator
        apartments={simulatorApartments}
        seasons={simulatorSeasons}
        seasonPeriods={simulatorPeriods}
        localTaxPerNight={taxConfig.localTaxPerNight}
      />
    </div>
  );
}
