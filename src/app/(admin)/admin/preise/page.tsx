import { Metadata } from "next";
import { getDiscountCodes } from "../actions";
import { apartments } from "@/data/apartments";
import { seasonConfigs, seasonPeriods } from "@/data/seasons";
import { localTax } from "@/data/taxes";
import DiscountManager from "@/components/admin/DiscountManager";
import PriceSimulator from "@/components/admin/PriceSimulator";

export const metadata: Metadata = {
  title: "Preise & Rabatte",
};

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default async function PreisePage() {
  const discountCodes = await getDiscountCodes();

  const apartmentData = apartments.map((a) => ({
    id: a.id,
    name: a.name,
    basePrice: a.basePrice,
    extraPersonPrice: a.extraPersonPrice,
    cleaningFee: a.cleaningFee,
    dogFee: a.dogFee,
    baseGuests: a.baseGuests,
    maxGuests: a.maxGuests,
  }));

  const seasonsData = Object.values(seasonConfigs).map((s) => ({
    type: s.type,
    label: s.label,
    multiplier: s.multiplier,
    minNights: s.minNights,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Preise & Rabatte</h1>

      {/* Discount Code Manager */}
      <DiscountManager initialCodes={discountCodes} />

      {/* Season Overview */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Saisonpreise</h2>
        </div>
        <div className="p-5">
          {/* Season types */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Object.values(seasonConfigs).map((season) => (
              <div
                key={season.type}
                className={`rounded-xl p-4 border ${
                  season.type === "high"
                    ? "bg-amber-50 border-amber-200"
                    : season.type === "mid"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-stone-50 border-stone-200"
                }`}
              >
                <h3
                  className={`text-sm font-semibold mb-2 ${
                    season.type === "high"
                      ? "text-amber-700"
                      : season.type === "mid"
                      ? "text-blue-700"
                      : "text-stone-600"
                  }`}
                >
                  {season.label}
                </h3>
                <p className="text-xs text-stone-600 mb-1">
                  Faktor: <span className="font-bold">&times;{season.multiplier}</span>
                </p>
                <p className="text-xs text-stone-600">
                  Min. Nächte: <span className="font-bold">{season.minNights}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Season periods */}
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Zeiträume</h3>
          <div className="space-y-1.5">
            {seasonPeriods.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm py-1.5"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.type === "high"
                      ? "bg-amber-400"
                      : p.type === "mid"
                      ? "bg-blue-400"
                      : "bg-stone-300"
                  }`}
                />
                <span className="text-stone-500 w-28 shrink-0 font-mono text-xs">
                  {p.start} – {p.end}
                </span>
                <span className="text-stone-700">{p.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm py-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
              <span className="text-stone-500 w-28 shrink-0 font-mono text-xs">
                Restliche
              </span>
              <span className="text-stone-700">Nebensaison (&times;0.85)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Apartment prices */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Wohnungspreise</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Wohnung
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Basis/Nacht
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">
                  Hochsaison
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">
                  Nebensaison
                </th>
                <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Reinigung
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">
                  Zusatzgast
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {apartments.map((apt) => (
                <tr key={apt.id}>
                  <td className="px-5 py-3 font-medium text-stone-900">
                    {apt.name}
                    <span className="block text-xs text-stone-400 font-normal">
                      {apt.size} m² · bis {apt.maxGuests} Pers.
                    </span>
                  </td>
                  <td className="text-right px-3 py-3 text-stone-700">
                    {formatCurrency(apt.basePrice)}
                  </td>
                  <td className="text-right px-3 py-3 text-stone-700 hidden sm:table-cell">
                    {formatCurrency(apt.basePrice * 1.3)}
                  </td>
                  <td className="text-right px-3 py-3 text-stone-700 hidden sm:table-cell">
                    {formatCurrency(apt.basePrice * 0.85)}
                  </td>
                  <td className="text-right px-3 py-3 text-stone-700">
                    {formatCurrency(apt.cleaningFee)}
                  </td>
                  <td className="text-right px-5 py-3 text-stone-700 hidden sm:table-cell">
                    {formatCurrency(apt.extraPersonPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Simulator */}
      <PriceSimulator
        apartments={apartmentData}
        seasons={seasonsData}
        localTaxPerNight={localTax.perPersonPerNight}
      />
    </div>
  );
}
