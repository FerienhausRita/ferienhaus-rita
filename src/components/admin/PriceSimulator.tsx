"use client";

import { useState } from "react";

interface Apartment {
  id: string;
  name: string;
  basePrice: number;
  extraPersonPrice: number;
  cleaningFee: number;
  dogFee: number;
  baseGuests: number;
  maxGuests: number;
}

interface SeasonConfig {
  type: string;
  label: string;
  multiplier: number;
  minNights: number;
}

interface SeasonPeriod {
  start: string;
  end: string;
  type: string;
  label: string;
}

interface PriceSimulatorProps {
  apartments: Apartment[];
  seasons: SeasonConfig[];
  seasonPeriods: SeasonPeriod[];
  localTaxPerNight: number;
}

export default function PriceSimulator({
  apartments,
  seasons,
  seasonPeriods,
  localTaxPerNight,
}: PriceSimulatorProps) {
  const [apartmentId, setApartmentId] = useState(apartments[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [dogs, setDogs] = useState(0);

  const apartment = apartments.find((a) => a.id === apartmentId);

  // Build a lookup from season type to config
  const seasonConfigMap = new Map(seasons.map((s) => [s.type, s]));

  // Low season fallback
  const lowSeason = seasonConfigMap.get("low") ?? {
    type: "low",
    label: "Nebensaison",
    multiplier: 0.85,
    minNights: 2,
  };

  const getSeasonForDate = (
    date: Date
  ): { multiplier: number; label: string } => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const mmdd = `${mm}-${dd}`;

    for (const period of seasonPeriods) {
      if (period.start <= period.end) {
        // Normal range (e.g. 07-01 to 08-31)
        if (mmdd >= period.start && mmdd <= period.end) {
          const config = seasonConfigMap.get(period.type);
          return {
            multiplier: config?.multiplier ?? 1.0,
            label: config?.label ?? period.label,
          };
        }
      } else {
        // Wrapping range (e.g. 12-20 to 01-06)
        if (mmdd >= period.start || mmdd <= period.end) {
          const config = seasonConfigMap.get(period.type);
          return {
            multiplier: config?.multiplier ?? 1.0,
            label: config?.label ?? period.label,
          };
        }
      }
    }

    // Default: low season
    return { multiplier: lowSeason.multiplier, label: lowSeason.label };
  };

  const calculateResult = () => {
    if (!apartment || !checkIn || !checkOut) return null;

    const start = new Date(checkIn + "T00:00:00");
    const end = new Date(checkOut + "T00:00:00");
    const nights = Math.max(
      0,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (nights <= 0) return null;

    let basePriceTotal = 0;
    const current = new Date(start);
    const seasonBreakdown = new Map<
      string,
      { label: string; nights: number; pricePerNight: number; total: number }
    >();

    for (let i = 0; i < nights; i++) {
      const { multiplier, label } = getSeasonForDate(current);
      const nightPrice =
        Math.round(apartment.basePrice * multiplier * 100) / 100;

      const existing = seasonBreakdown.get(label);
      if (existing) {
        existing.nights += 1;
        existing.total += nightPrice;
      } else {
        seasonBreakdown.set(label, {
          label,
          nights: 1,
          pricePerNight: nightPrice,
          total: nightPrice,
        });
      }

      basePriceTotal += nightPrice;
      current.setDate(current.getDate() + 1);
    }

    const totalGuests = adults + children;
    const extraGuests = Math.max(0, totalGuests - apartment.baseGuests);
    const extraGuestsTotal =
      extraGuests * apartment.extraPersonPrice * nights;
    const dogsTotal = dogs * apartment.dogFee * nights;
    const localTaxTotal = adults * nights * localTaxPerNight;
    const total =
      basePriceTotal +
      extraGuestsTotal +
      dogsTotal +
      apartment.cleaningFee +
      localTaxTotal;

    return {
      nights,
      basePriceTotal: Math.round(basePriceTotal * 100) / 100,
      seasonBreakdown: Array.from(seasonBreakdown.values()),
      extraGuests,
      extraGuestsTotal,
      dogsTotal,
      cleaningFee: apartment.cleaningFee,
      localTaxTotal,
      total: Math.round(total * 100) / 100,
    };
  };

  const result = calculateResult();

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">Preissimulator</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Berechne den Preis für eine Buchung
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Wohnung
            </label>
            <select
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            >
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({fmt(a.basePrice)}/Nacht)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Erwachsene
            </label>
            <input
              type="number"
              min={1}
              max={apartment?.maxGuests ?? 6}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Kinder
            </label>
            <input
              type="number"
              min={0}
              max={apartment?.maxGuests ?? 6}
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Hunde
            </label>
            <input
              type="number"
              min={0}
              max={2}
              value={dogs}
              onChange={(e) => setDogs(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="pt-4 border-t border-stone-200 space-y-2 text-sm">
            {result.seasonBreakdown.map((s) => (
              <div key={s.label} className="flex justify-between">
                <span className="text-stone-600">
                  {s.nights} Nacht{s.nights > 1 ? "e" : ""} {s.label} &times;{" "}
                  {fmt(s.pricePerNight)}
                </span>
                <span className="text-stone-900">{fmt(s.total)}</span>
              </div>
            ))}
            {result.extraGuests > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">
                  {result.extraGuests} Zusatzgast
                  {result.extraGuests > 1 ? "e" : ""} &times; {result.nights}{" "}
                  Nächte
                </span>
                <span className="text-stone-900">
                  {fmt(result.extraGuestsTotal)}
                </span>
              </div>
            )}
            {result.dogsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">
                  {dogs} Hund{dogs > 1 ? "e" : ""} &times; {result.nights}{" "}
                  Nächte
                </span>
                <span className="text-stone-900">{fmt(result.dogsTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-600">Endreinigung</span>
              <span className="text-stone-900">{fmt(result.cleaningFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">
                Ortstaxe ({adults} Erw. &times; {result.nights} Nächte &times;{" "}
                {fmt(localTaxPerNight)})
              </span>
              <span className="text-stone-900">
                {fmt(result.localTaxTotal)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-stone-200 font-bold text-base">
              <span className="text-stone-900">Gesamt</span>
              <span className="text-stone-900">{fmt(result.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
