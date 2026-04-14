import { Metadata } from "next";
import { getDiscountCodes, getSpecialPeriods } from "../actions";
import {
  getAllApartmentsWithPricing,
  getSpecialPeriodsFromDB,
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
  const [discountCodes, allApartments, specialPeriods, taxConfig] =
    await Promise.all([
      getDiscountCodes(),
      getAllApartmentsWithPricing(),
      getSpecialPeriodsFromDB(),
      getTaxConfigFromDB(),
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
      | { base_price: number; summer_price: number; winter_price: number; extra_person_price: number; cleaning_fee: number; dog_fee: number; min_nights_summer: number; min_nights_winter: number }
      | undefined;
    return {
      id: a.id,
      name: a.name,
      summer_price: dbRow?.summer_price ? Number(dbRow.summer_price) : a.summerPrice,
      winter_price: dbRow?.winter_price ? Number(dbRow.winter_price) : a.winterPrice,
      extra_person_price: dbRow ? Number(dbRow.extra_person_price) : a.extraPersonPrice,
      cleaning_fee: dbRow ? Number(dbRow.cleaning_fee) : a.cleaningFee,
      dog_fee: dbRow ? Number(dbRow.dog_fee) : a.dogFee,
      min_nights_summer: dbRow?.min_nights_summer ? Number(dbRow.min_nights_summer) : a.minNightsSummer,
      min_nights_winter: dbRow?.min_nights_winter ? Number(dbRow.min_nights_winter) : a.minNightsWinter,
    };
  });

  // Special periods for editor
  const editorSpecialPeriods = specialPeriods.map((sp) => ({
    id: sp.id ?? crypto.randomUUID(),
    label: sp.label,
    start_mmdd: sp.startMmdd,
    end_mmdd: sp.endMmdd,
    surcharge_percent: sp.surchargePercent,
    min_nights: sp.minNights,
    active: sp.active,
  }));

  // Simulator props
  const simulatorApartments = allApartments.map((a) => ({
    id: a.id,
    name: a.name,
    summerPrice: a.summerPrice,
    winterPrice: a.winterPrice,
    basePrice: a.basePrice,
    extraPersonPrice: a.extraPersonPrice,
    cleaningFee: a.cleaningFee,
    dogFee: a.dogFee,
    baseGuests: a.baseGuests,
    maxGuests: a.maxGuests,
  }));

  const simulatorSpecialPeriods = specialPeriods
    .filter((sp) => sp.active)
    .map((sp) => ({
      label: sp.label,
      startMmdd: sp.startMmdd,
      endMmdd: sp.endMmdd,
      surchargePercent: sp.surchargePercent,
      minNights: sp.minNights,
      active: sp.active,
    }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Preise & Rabatte</h1>

      {/* Pricing Editor */}
      <PricingEditor
        apartments={editorApartments}
        specialPeriods={editorSpecialPeriods}
        taxConfig={taxConfig}
      />

      {/* Discount Code Manager */}
      <DiscountManager initialCodes={discountCodes} />

      {/* Price Simulator */}
      <PriceSimulator
        apartments={simulatorApartments}
        specialPeriods={simulatorSpecialPeriods}
        localTaxPerNight={taxConfig.localTaxPerNight}
      />
    </div>
  );
}
