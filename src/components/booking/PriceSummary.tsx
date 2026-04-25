import { PriceBreakdown, formatCurrency } from "@/lib/pricing";
import { localTax } from "@/data/taxes";
import LocalTaxHint from "@/components/booking/LocalTaxHint";

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  dogs: number;
  compact?: boolean;
}

export default function PriceSummary({
  breakdown,
  dogs,
  compact = false,
}: PriceSummaryProps) {
  const hasMultipleSeasons = breakdown.seasonBreakdown.length > 1;

  return (
    <div className="space-y-3 text-sm">
      {!compact && hasMultipleSeasons ? (
        breakdown.seasonBreakdown.map((entry) => (
          <div key={entry.type} className="flex justify-between text-stone-600">
            <span>
              {entry.nights} {entry.nights === 1 ? "Nacht" : "Nächte"} ×{" "}
              {formatCurrency(entry.pricePerNight)}{" "}
              <span className="text-stone-400 text-xs">({entry.label})</span>
            </span>
            <span>{formatCurrency(entry.total)}</span>
          </div>
        ))
      ) : (
        <div className="flex justify-between text-stone-600">
          <span>
            {breakdown.nights}{" "}
            {breakdown.nights === 1 ? "Nacht" : "Nächte"} ×{" "}
            {formatCurrency(breakdown.basePrice)}
            {hasMultipleSeasons && (
              <span className="text-stone-400 text-xs"> (Ø)</span>
            )}
          </span>
          <span>{formatCurrency(breakdown.basePriceTotal)}</span>
        </div>
      )}

      {breakdown.extraAdults > 0 && (
        <div className="flex justify-between text-stone-600">
          <span>
            {breakdown.extraAdults} zusätzliche{" "}
            {breakdown.extraAdults === 1 ? "Person" : "Personen"} (Erw.) ×{" "}
            {breakdown.nights} {breakdown.nights === 1 ? "Nacht" : "Nächte"}
          </span>
          <span>{formatCurrency(breakdown.extraAdultsTotal)}</span>
        </div>
      )}

      {breakdown.extraChildren > 0 && (
        <div className="flex justify-between text-stone-600">
          <span>
            {breakdown.extraChildren}{" "}
            {breakdown.extraChildren === 1 ? "Kind" : "Kinder"} (bis 12 J.) ×{" "}
            {breakdown.nights} {breakdown.nights === 1 ? "Nacht" : "Nächte"}
          </span>
          <span>{formatCurrency(breakdown.extraChildrenTotal)}</span>
        </div>
      )}

      {breakdown.dogsTotal > 0 && (
        <div className="flex justify-between text-stone-600">
          <span>
            {dogs} {dogs === 1 ? "Hund" : "Hunde"}
            {dogs > 1 && (
              <span className="text-stone-400 text-xs">
                {" "}(1×{formatCurrency(breakdown.firstDogFee)} +{" "}
                {dogs - 1}×{formatCurrency(breakdown.additionalDogFee)})
              </span>
            )}
            {" "}× {breakdown.nights}{" "}
            {breakdown.nights === 1 ? "Nacht" : "Nächte"}
          </span>
          <span>{formatCurrency(breakdown.dogsTotal)}</span>
        </div>
      )}

      <div className="flex justify-between text-stone-600">
        <span>Endreinigung</span>
        <span>{formatCurrency(breakdown.cleaningFee)}</span>
      </div>

      {/* Legacy: bei Altbuchungen war Kurtaxe im Gesamtpreis */}
      {breakdown.localTaxTotal > 0 && (
        <div className="flex justify-between text-stone-600">
          <span>
            Kurtaxe{" "}
            <span className="text-stone-400 text-xs">
              ({formatCurrency(breakdown.localTaxPerNight ?? localTax.perPersonPerNight)}/Erw./Nacht,
              Kinder unter {breakdown.localTaxExemptAge ?? localTax.exemptAge} Jahren frei)
            </span>
          </span>
          <span>{formatCurrency(breakdown.localTaxTotal)}</span>
        </div>
      )}

      {breakdown.discountAmount > 0 && breakdown.discountLabel && (
        <div className="flex justify-between text-emerald-600">
          <span>{breakdown.discountLabel}</span>
          <span>-{formatCurrency(breakdown.discountAmount)}</span>
        </div>
      )}

      <div className="pt-3 mt-3 border-t border-stone-200 flex justify-between font-semibold text-stone-900 text-base">
        <span>Gesamtpreis</span>
        <span>{formatCurrency(breakdown.total)}</span>
      </div>

      {breakdown.vatAmount > 0 && (
        <div className="flex justify-between text-stone-400 text-xs">
          <span>Inkl. 10% MwSt</span>
          <span>{formatCurrency(breakdown.vatAmount)}</span>
        </div>
      )}

      {/* Kurtaxe-Hinweis wenn separat (neue Buchungen) */}
      {breakdown.localTaxIncluded === false && breakdown.localTaxPerNight > 0 && (
        <div className="pt-2">
          <LocalTaxHint
            rate={breakdown.localTaxPerNight}
            exemptAge={breakdown.localTaxExemptAge ?? localTax.exemptAge}
            variant="default"
            estimate={breakdown.localTaxHint}
          />
        </div>
      )}

      <p className="text-[10px] text-stone-400 mt-2">
        * Alle Preise inkl. 10% MwSt.
      </p>
    </div>
  );
}
