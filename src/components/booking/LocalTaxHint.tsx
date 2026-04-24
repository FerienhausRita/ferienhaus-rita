import { formatCurrency } from "@/lib/pricing";

interface LocalTaxHintProps {
  rate: number;
  exemptAge: number;
  /** Compact variant for tight places */
  variant?: "default" | "compact" | "subtle";
  /** Optional additional info (e.g., current estimate for this stay) */
  estimate?: number;
}

/**
 * Small info banner reminding guests that Kurtaxe is charged separately
 * on site and not included in the booking total. Rate is displayed
 * dynamically so it updates when admin changes the tax_config.
 */
export default function LocalTaxHint({
  rate,
  exemptAge,
  variant = "default",
  estimate,
}: LocalTaxHintProps) {
  const rateText = `${formatCurrency(rate)} pro Person ab ${exemptAge} Jahren pro Nacht`;

  if (variant === "subtle") {
    return (
      <p className="text-[11px] text-stone-400 italic leading-relaxed">
        Hinweis: Kurtaxe ({rateText}) wird separat vor Ort abgerechnet und
        ist nicht im Gesamtpreis enthalten.
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1.5">
        <strong className="text-stone-700">Kurtaxe:</strong> {rateText}.
        Separat vor Ort zu bezahlen.
      </div>
    );
  }

  return (
    <div className="text-xs text-stone-600 bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-2.5">
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <div>
          <strong className="text-stone-800">Kurtaxe</strong> (
          {rateText}) wird <strong>separat vor Ort</strong> abgerechnet und ist
          nicht im Gesamtpreis enthalten.
          {typeof estimate === "number" && estimate > 0 && (
            <>
              {" "}
              <span className="text-stone-500">
                Voraussichtlich ca. {formatCurrency(estimate)} für Ihren
                Aufenthalt.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
