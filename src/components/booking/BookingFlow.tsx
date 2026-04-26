"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { apartments as staticApartments, Apartment } from "@/data/apartments";
import { calculatePrice, formatCurrency, PriceBreakdown, PricingOverrides, getMinNightsWithOverrides, getMinNightsForRange } from "@/lib/pricing";
import { isAvailable } from "@/lib/availability";
import { getMinNights, SpecialPeriod } from "@/data/seasons";
import { validateDiscountCode, DiscountCode } from "@/data/discounts";
import { SeasonConfig, SeasonPeriod } from "@/data/seasons";
import Image from "next/image";
import Container from "@/components/ui/Container";
import PriceSummary from "@/components/booking/PriceSummary";
import WaitlistCard from "@/components/booking/WaitlistCard";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import DateRangePicker from "@/components/booking/DateRangePicker";
import AddressAutocomplete from "@/components/booking/AddressAutocomplete";

type Step = "search" | "details" | "confirmation";

interface BookingFlowProps {
  /** DB-sourced apartments (optional – falls back to static) */
  apartmentsData?: Apartment[];
  seasonConfigsData?: Record<string, SeasonConfig>;
  seasonPeriodsData?: SeasonPeriod[];
  specialPeriodsData?: SpecialPeriod[];
  taxConfigData?: { localTaxPerNight: number; vatRate: number };
}

interface BookingSearch {
  checkIn: string;
  checkOut: string;
  /** Gäste ab 3 Jahren (Auslastungsbasis, einheitlicher Tarif) */
  adults: number;
  /** Davon Kinder zwischen 3 und 17 Jahren (Untermenge von adults, info-only) */
  children: number;
  /** Kleinkinder unter 3 Jahren (kostenfrei, zählen nicht zur Auslastung) */
  infants: number;
  dogs: number;
}

interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  notes: string;
  privacy: boolean;
}

const inputClasses =
  "w-full h-[46px] px-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 focus:border-[var(--color-gold)] transition-all";

export default function BookingFlow({
  apartmentsData,
  seasonConfigsData,
  seasonPeriodsData,
  specialPeriodsData,
  taxConfigData,
}: BookingFlowProps = {}) {
  const searchParams = useSearchParams();

  // Use DB-sourced data if available, fall back to static
  const apartments = apartmentsData ?? staticApartments;

  // Build pricing overrides from DB data
  const pricingOverrides: PricingOverrides | undefined =
    seasonConfigsData || seasonPeriodsData || specialPeriodsData || taxConfigData
      ? {
          seasonConfigs: seasonConfigsData,
          seasonPeriods: seasonPeriodsData,
          specialPeriods: specialPeriodsData,
          localTaxPerNight: taxConfigData?.localTaxPerNight,
          vatRate: taxConfigData?.vatRate,
        }
      : undefined;

  const [step, setStep] = useState<Step>("search");
  const [search, setSearch] = useState<BookingSearch>({
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    adults: parseInt(searchParams.get("guests") || "2"),
    children: 0,
    infants: 0,
    dogs: 0,
  });
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(
    () => {
      const slug = searchParams.get("apartment");
      return slug ? apartments.find((a) => a.slug === slug) || null : null;
    }
  );
  const [guest, setGuest] = useState<GuestDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    zip: "",
    city: "",
    country: "AT",
    notes: "",
    privacy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [activeDiscount, setActiveDiscount] = useState<DiscountCode | null>(
    null
  );
  const [discountError, setDiscountError] = useState<string | null>(null);

  const priceSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedApartment && priceSectionRef.current) {
      setTimeout(() => {
        priceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [selectedApartment]);

  const today = new Date().toISOString().split("T")[0];
  // Kleinkinder unter 3 zählen NICHT zur maxGuests-Auslastung.
  // children ist additiv (Bestandsbuchungen) — bei neuen Buchungen ist es 0.
  const totalGuests = search.adults + search.children;

  const [availableApartments, setAvailableApartments] = useState<Apartment[]>(apartments);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (!search.checkIn || !search.checkOut) {
      setAvailableApartments(apartments);
      return;
    }
    setCheckingAvailability(true);
    try {
      const guestFiltered = apartments.filter(
        (a) => a.maxGuests >= totalGuests && a.available
      );
      const checks = await Promise.all(
        guestFiltered.map(async (a) => ({
          apartment: a,
          available: await isAvailable(
            a.id,
            new Date(search.checkIn),
            new Date(search.checkOut)
          ),
        }))
      );
      setAvailableApartments(checks.filter((c) => c.available).map((c) => c.apartment));
    } catch {
      // On error, show guest-filtered apartments without availability filtering
      setAvailableApartments(
        apartments.filter((a) => a.maxGuests >= totalGuests && a.available)
      );
    } finally {
      setCheckingAvailability(false);
    }
  }, [search.checkIn, search.checkOut, totalGuests]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const priceBreakdown: PriceBreakdown | null = useMemo(() => {
    if (!selectedApartment || !search.checkIn || !search.checkOut) return null;
    return calculatePrice({
      apartment: selectedApartment,
      checkIn: new Date(search.checkIn),
      checkOut: new Date(search.checkOut),
      adults: search.adults,
      children: search.children,
      dogs: search.dogs,
      discount: activeDiscount,
      overrides: pricingOverrides,
    });
  }, [selectedApartment, search, activeDiscount, pricingOverrides]);

  const minNights = useMemo(() => {
    if (!search.checkIn || !search.checkOut) return 1;
    const ci = new Date(search.checkIn);
    const co = new Date(search.checkOut);
    // Use new model if apartment has summer/winter prices
    if (selectedApartment && (selectedApartment.summerPrice > 0 || selectedApartment.winterPrice > 0)) {
      return getMinNightsForRange(
        ci, co,
        selectedApartment,
        pricingOverrides?.specialPeriods ?? [],
      );
    }
    // Legacy fallback
    if (pricingOverrides?.seasonPeriods || pricingOverrides?.seasonConfigs) {
      return getMinNightsWithOverrides(ci, co, pricingOverrides.seasonPeriods, pricingOverrides.seasonConfigs);
    }
    return getMinNights(ci, co);
  }, [search.checkIn, search.checkOut, selectedApartment, pricingOverrides]);

  const nightsCount = useMemo(() => {
    if (!search.checkIn || !search.checkOut) return 0;
    const diff =
      new Date(search.checkOut).getTime() - new Date(search.checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [search.checkIn, search.checkOut]);

  const belowMinNights = nightsCount > 0 && nightsCount < minNights;

  function handleApplyDiscount() {
    setDiscountError(null);
    if (!discountCode.trim()) return;
    const result = validateDiscountCode(discountCode);
    if (result) {
      setActiveDiscount(result);
      setDiscountError(null);
    } else {
      setActiveDiscount(null);
      setDiscountError("Ungültiger Rabattcode");
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function validateGuestDetails(): boolean {
    const newErrors: Record<string, string> = {};
    if (!guest.firstName.trim())
      newErrors.firstName = "Bitte Vorname eingeben";
    if (!guest.lastName.trim())
      newErrors.lastName = "Bitte Nachname eingeben";
    if (!guest.email.trim()) newErrors.email = "Bitte E-Mail eingeben";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email))
      newErrors.email = "Bitte gültige E-Mail eingeben";
    if (!guest.phone.trim()) newErrors.phone = "Bitte Telefonnummer eingeben";
    if (!guest.street.trim()) newErrors.street = "Bitte Adresse eingeben";
    if (!guest.zip.trim()) newErrors.zip = "Bitte PLZ eingeben";
    if (!guest.city.trim()) newErrors.city = "Bitte Ort eingeben";
    if (!guest.privacy)
      newErrors.privacy = "Bitte Datenschutzerklärung akzeptieren";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateGuestDetails() || !selectedApartment) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartmentId: selectedApartment.id,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          adults: search.adults,
          children: search.children,
          infants: search.infants,
          dogs: search.dogs,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          street: guest.street,
          zip: guest.zip,
          city: guest.city,
          country: guest.country,
          notes: guest.notes,
          privacy: guest.privacy,
          discountCode: activeDiscount?.code || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setSubmitError(result.message);
          setTimeout(() => setStep("search"), 3000);
        } else {
          setSubmitError(result.message || "Ein Fehler ist aufgetreten.");
        }
        return;
      }

      setBookingId(result.bookingId);
      setStep("confirmation");
    } catch {
      setSubmitError(
        "Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const steps = [
    { key: "search", label: "Wohnung wählen" },
    { key: "details", label: "Ihre Daten" },
    { key: "confirmation", label: "Bestätigung" },
  ];

  return (
    <div className="pt-28 pb-24 min-h-screen bg-stone-50">
      <Container>
        {/* Step Indicator */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step === s.key
                        ? "bg-alpine-600 text-white"
                        : steps.findIndex((x) => x.key === step) > i
                        ? "bg-alpine-100 text-alpine-700"
                        : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {steps.findIndex((x) => x.key === step) > i ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      step === s.key ? "text-alpine-700" : "text-stone-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-4 ${
                      steps.findIndex((x) => x.key === step) > i
                        ? "bg-alpine-300"
                        : "bg-stone-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Search & Select */}
        {step === "search" && (
          <div className="max-w-5xl mx-auto">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2 text-center">
              Verfügbarkeit prüfen
            </h1>
            <p className="text-stone-500 text-center mb-10">
              Wählen Sie Ihren Reisezeitraum und finden Sie die passende
              Wohnung.
            </p>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 mb-10">
              <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-end">
                <div className="col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-stone-700 mb-2">Reisezeitraum</label>
                  <DateRangePicker
                    checkIn={search.checkIn}
                    checkOut={search.checkOut}
                    onChange={(ci, co) => setSearch({ ...search, checkIn: ci, checkOut: co })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Gäste (ab 3 J.)</label>
                  <select value={search.adults}
                    onChange={(e) => setSearch({ ...search, adults: parseInt(e.target.value) })}
                    className={inputClasses}>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Kleinkinder (bis 3 J.)</label>
                  <select value={search.infants}
                    onChange={(e) => setSearch({ ...search, infants: parseInt(e.target.value) })}
                    className={inputClasses}>
                    {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Hunde</label>
                  <select value={search.dogs}
                    onChange={(e) => setSearch({ ...search, dogs: parseInt(e.target.value) })}
                    className={inputClasses}>
                    {[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {search.checkIn && search.checkOut && (
              <div>
                <h2 className="text-xl font-semibold text-stone-900 mb-6">
                  {checkingAvailability
                    ? "Verfügbarkeit wird geprüft..."
                    : availableApartments.length > 0
                    ? `${availableApartments.length} ${availableApartments.length === 1 ? "Wohnung verfügbar" : "Wohnungen verfügbar"}`
                    : "Keine Wohnungen für Ihre Auswahl verfügbar"}
                </h2>
                <div className="space-y-4">
                  {availableApartments.map((apt) => {
                    const price = calculatePrice({
                      apartment: apt, checkIn: new Date(search.checkIn),
                      checkOut: new Date(search.checkOut), adults: search.adults,
                      children: search.children, dogs: search.dogs,
                      overrides: pricingOverrides,
                    });
                    const isSelected = selectedApartment?.id === apt.id;
                    return (
                      <div key={apt.id}
                        className={`bg-white rounded-2xl border-2 p-6 transition-all cursor-pointer ${
                          isSelected ? "border-alpine-500 shadow-lg ring-1 ring-alpine-500" : "border-stone-200 hover:border-alpine-300 hover:shadow-md"
                        }`}
                        onClick={() => setSelectedApartment(apt)}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                          <div className="relative w-full h-40 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0">
                            <Image src={apt.images[0]} alt={apt.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 120px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="text-lg font-semibold text-stone-900">{apt.name}</h3>
                              <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{apt.size} m²</span>
                              <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">max. {apt.maxGuests} Gäste</span>
                            </div>
                            <p className="text-sm text-stone-500 mb-3 line-clamp-2">{apt.shortDescription}</p>
                            <div className="flex flex-wrap gap-2 hidden sm:flex">
                              {apt.features.slice(0, 4).map((f) => (
                                <span key={f} className="inline-flex items-center gap-1 text-xs text-stone-500">
                                  <svg className="w-3 h-3 text-alpine-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 sm:text-right">
                            <div>
                              <div className="text-2xl font-bold text-stone-900">{formatCurrency(price.total)}</div>
                              <div className="text-sm text-stone-500">{price.nights} {price.nights === 1 ? "Nacht" : "Nächte"}</div>
                            </div>
                            <div className="text-xs text-stone-400 mt-1">ab {formatCurrency(Math.min(apt.summerPrice || apt.basePrice, apt.winterPrice || apt.basePrice))} / Nacht</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Warteliste-Card erscheint, wenn keine Wohnung verfügbar ist */}
                {!checkingAvailability && availableApartments.length === 0 && (
                  <WaitlistCard
                    checkIn={search.checkIn}
                    checkOut={search.checkOut}
                    apartmentsData={(apartmentsData ?? []).map((a) => ({
                      id: a.id,
                      name: a.name,
                    }))}
                  />
                )}

                {selectedApartment && priceBreakdown && (
                  <div ref={priceSectionRef} className="mt-8 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">
                      Preisübersicht – {selectedApartment.name}
                    </h3>
                    <PriceSummary breakdown={priceBreakdown} dogs={search.dogs} infants={search.infants} />

                    <div className="mt-6 pt-4 border-t border-stone-100">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Rabattcode</label>
                      <div className="flex gap-2">
                        <input type="text" value={discountCode}
                          onChange={(e) => { setDiscountCode(e.target.value); if (!e.target.value.trim()) { setActiveDiscount(null); setDiscountError(null); }}}
                          placeholder="Code eingeben"
                          className={`${inputClasses} flex-1 text-sm`} />
                        <button type="button" onClick={handleApplyDiscount}
                          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-medium transition-colors">
                          Einlösen
                        </button>
                      </div>
                      {discountError && <p className="text-red-500 text-xs mt-1">{discountError}</p>}
                      {activeDiscount && <p className="text-emerald-600 text-xs mt-1">{activeDiscount.label} angewendet</p>}
                    </div>

                    <button onClick={() => setStep("details")} disabled={belowMinNights}
                      className="w-full mt-6 bg-alpine-600 hover:bg-alpine-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-4 rounded-xl text-lg font-semibold transition-all hover:shadow-lg">
                      Weiter zur Buchungsanfrage
                    </button>
                  </div>
                )}
              </div>
            )}

            {belowMinNights && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                Der gewählte Zeitraum erfordert mindestens <strong>{minNights} Nächte</strong> (aktuell: {nightsCount}). Bitte passen Sie Ihre Auswahl an.
              </div>
            )}

            {selectedApartment && (
              <div className="mt-8 bg-white rounded-2xl border border-stone-200 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-stone-900 mb-1">
                  Verfügbarkeit – {selectedApartment.name}
                </h3>
                <p className="text-sm text-stone-500 mb-4">Klicken Sie auf Daten, um Ihren Zeitraum zu ändern</p>
                <AvailabilityCalendar
                  apartmentId={selectedApartment.id} checkIn={search.checkIn} checkOut={search.checkOut}
                  onSelectRange={(ci, co) => setSearch({ ...search, checkIn: ci, checkOut: co })} />
              </div>
            )}

            {(!search.checkIn || !search.checkOut) && !selectedApartment && (
              <div className="text-center py-16 text-stone-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-lg font-medium">Wählen Sie Ihren Reisezeitraum</p>
                <p className="text-sm mt-1">Anreise- und Abreisedatum eingeben, um verfügbare Wohnungen zu sehen.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Guest Details */}
        {step === "details" && selectedApartment && priceBreakdown && (
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setStep("search")}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6 text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück zur Wohnungsauswahl
            </button>

            <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Buchungsanfrage</h1>
            <p className="text-stone-500 mb-10">Bitte geben Sie Ihre Daten ein, um die Buchungsanfrage abzuschließen.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8 order-2 lg:order-1">
                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-stone-900 mb-6">Persönliche Daten</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Vorname" value={guest.firstName} onChange={(v) => setGuest({ ...guest, firstName: v })} error={errors.firstName} required />
                    <InputField label="Nachname" value={guest.lastName} onChange={(v) => setGuest({ ...guest, lastName: v })} error={errors.lastName} required />
                    <InputField label="E-Mail" type="email" value={guest.email} onChange={(v) => setGuest({ ...guest, email: v })} error={errors.email} required />
                    <InputField label="Telefon" type="tel" value={guest.phone} onChange={(v) => setGuest({ ...guest, phone: v })} error={errors.phone} required />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-stone-900 mb-6">Adresse</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <AddressAutocomplete
                        value={guest.street}
                        onChange={(v) => setGuest({ ...guest, street: v })}
                        onSelect={(addr) => {
                          const countryCode =
                            addr.country.toLowerCase().includes("österreich") ||
                            addr.country.toLowerCase().includes("austria")
                              ? "AT"
                              : addr.country.toLowerCase().includes("deutschland") ||
                                addr.country.toLowerCase().includes("germany")
                              ? "DE"
                              : addr.country.toLowerCase().includes("schweiz") ||
                                addr.country.toLowerCase().includes("switzerland")
                              ? "CH"
                              : guest.country;
                          setGuest({
                            ...guest,
                            street: addr.street,
                            zip: addr.zip,
                            city: addr.city,
                            country: countryCode,
                          });
                        }}
                        error={errors.street}
                        required
                      />
                    </div>
                    <InputField label="PLZ" value={guest.zip} onChange={(v) => setGuest({ ...guest, zip: v })} error={errors.zip} required />
                    <InputField label="Ort" value={guest.city} onChange={(v) => setGuest({ ...guest, city: v })} error={errors.city} required />
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Land</label>
                      <select value={guest.country} onChange={(e) => setGuest({ ...guest, country: e.target.value })} className={inputClasses}>
                        <option value="AT">Österreich</option>
                        <option value="DE">Deutschland</option>
                        <option value="CH">Schweiz</option>
                        <option value="IT">Italien</option>
                        <option value="NL">Niederlande</option>
                        <option value="OTHER">Anderes Land</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-stone-900 mb-6">Bemerkungen</h2>
                  <textarea value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                    placeholder="Besondere Wünsche, Anreisezeit, Fragen..." rows={4}
                    className={`${inputClasses} resize-none`} />
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={guest.privacy}
                      onChange={(e) => setGuest({ ...guest, privacy: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-stone-300 text-alpine-600 focus:ring-alpine-500" />
                    <span className="text-sm text-stone-600">
                      Ich habe die{" "}
                      <a href="/datenschutz" target="_blank" className="text-alpine-600 underline hover:text-alpine-700">Datenschutzerklärung</a>{" "}
                      und die{" "}
                      <a href="/agb" target="_blank" className="text-alpine-600 underline hover:text-alpine-700">Buchungsbedingungen</a>{" "}
                      gelesen und akzeptiere diese. *
                    </span>
                  </label>
                  {errors.privacy && <p className="text-red-500 text-sm mt-2">{errors.privacy}</p>}

                  {submitError && (
                    <div role="alert" className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{submitError}</div>
                  )}

                  <button type="submit" disabled={isSubmitting}
                    className="w-full mt-6 bg-alpine-600 hover:bg-alpine-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white py-4 rounded-xl text-lg font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Wird gesendet...
                      </>
                    ) : "Buchungsanfrage absenden"}
                  </button>

                  <p className="text-xs text-stone-400 mt-3 text-center">
                    Dies ist eine unverbindliche Buchungsanfrage. Sie erhalten innerhalb von 24 Stunden eine Bestätigung per E-Mail.
                  </p>
                </div>
              </form>

              <div className="lg:col-span-1 order-1 lg:order-2">
                <div className="sticky top-28 bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-semibold text-stone-900 mb-4">Ihre Buchung</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-medium text-stone-800">{selectedApartment.name}</p>
                      <p className="text-stone-500">{selectedApartment.size} m² · {selectedApartment.floor}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-stone-100">
                      <div>
                        <p className="text-stone-400 text-xs">Anreise</p>
                        <p className="text-stone-800 font-medium">{new Date(search.checkIn).toLocaleDateString("de-AT")}</p>
                      </div>
                      <div>
                        <p className="text-stone-400 text-xs">Abreise</p>
                        <p className="text-stone-800 font-medium">{new Date(search.checkOut).toLocaleDateString("de-AT")}</p>
                      </div>
                    </div>
                    <div className="text-stone-600">
                      <p>
                        {search.adults} {search.adults === 1 ? "Gast" : "Gäste"}
                        {search.infants > 0 && <>, {search.infants} {search.infants === 1 ? "Kleinkind" : "Kleinkinder"} (unter 3 J.)</>}
                        {search.dogs > 0 && <>, {search.dogs} {search.dogs === 1 ? "Hund" : "Hunde"}</>}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-stone-100">
                      <PriceSummary breakdown={priceBreakdown} dogs={search.dogs} infants={search.infants} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirmation" && selectedApartment && priceBreakdown && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-12">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="font-serif text-3xl font-bold text-stone-900 mb-4">Vielen Dank für Ihre Anfrage!</h1>
              <p className="text-stone-500 text-lg mb-8">
                Ihre Buchungsanfrage für die <strong className="text-stone-700">{selectedApartment.name}</strong> wurde erfolgreich übermittelt. Sie erhalten in Kürze eine Bestätigung per E-Mail an <strong className="text-stone-700">{guest.email}</strong>.
              </p>

              {bookingId && (
                <div className="inline-block bg-alpine-50 text-alpine-800 px-4 py-2 rounded-lg text-sm font-medium mb-8">
                  Buchungsnummer: {bookingId.slice(0, 8).toUpperCase()}
                </div>
              )}

              <div className="bg-stone-50 rounded-xl p-6 text-left mb-8">
                <h3 className="font-semibold text-stone-900 mb-4">Zusammenfassung</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-stone-400">Wohnung</p><p className="text-stone-800 font-medium">{selectedApartment.name}</p></div>
                  <div><p className="text-stone-400">Gesamtpreis</p><p className="text-stone-800 font-medium">{formatCurrency(priceBreakdown.total)}</p></div>
                  <div><p className="text-stone-400">Anreise</p><p className="text-stone-800 font-medium">{new Date(search.checkIn).toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p></div>
                  <div><p className="text-stone-400">Abreise</p><p className="text-stone-800 font-medium">{new Date(search.checkOut).toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p></div>
                  <div><p className="text-stone-400">Gäste</p><p className="text-stone-800 font-medium">{search.adults} Personen{search.infants > 0 && ` + ${search.infants} Kleinkind${search.infants === 1 ? "" : "er"}`}</p></div>
                  <div><p className="text-stone-400">Nächte</p><p className="text-stone-800 font-medium">{priceBreakdown.nights}</p></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/" className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-3 rounded-xl font-semibold transition-all">
                  Zurück zur Startseite
                </a>
                <a href="/kontakt" className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-3 rounded-xl font-semibold transition-all">
                  Kontakt aufnehmen
                </a>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

function InputField({
  label, value, onChange, error, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className={`${inputClasses} ${error ? "border-red-300 bg-red-50" : ""}`} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
