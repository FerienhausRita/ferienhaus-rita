"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createManualBooking } from "@/app/(admin)/admin/actions";
import { calculatePrice, formatCurrency, PriceBreakdown } from "@/lib/pricing";
import type { SeasonConfig, SeasonPeriod } from "@/data/seasons";
import type { Apartment } from "@/data/apartments";

interface ApartmentData {
  id: string;
  name: string;
  maxGuests: number;
  baseGuests: number;
  basePrice: number;
  extraPersonPrice: number;
  cleaningFee: number;
  dogFee: number;
}

interface ManualBookingFormProps {
  apartments: ApartmentData[];
  seasonConfigs: Record<string, SeasonConfig>;
  seasonPeriods: SeasonPeriod[];
  taxConfig: { localTaxPerNight: number; vatRate: number };
}

const inputClasses =
  "w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e] transition-all";

export default function ManualBookingForm({
  apartments,
  seasonConfigs,
  seasonPeriods,
  taxConfig,
}: ManualBookingFormProps) {
  const router = useRouter();

  const [apartmentId, setApartmentId] = useState(apartments[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [dogs, setDogs] = useState(0);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("AT");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const [sendConfirmation, setSendConfirmation] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedApartment = apartments.find((a) => a.id === apartmentId);

  // Build a minimal Apartment-like object for calculatePrice
  const priceBreakdown: PriceBreakdown | null = useMemo(() => {
    if (!selectedApartment || !checkIn || !checkOut) return null;
    try {
      const apt = {
        ...selectedApartment,
        // Fill required Apartment fields with placeholders
        slug: selectedApartment.id,
        subtitle: "",
        description: "",
        shortDescription: "",
        size: 0,
        bedrooms: 0,
        bathrooms: 0,
        floor: "",
        features: [],
        highlights: [],
        amenities: [],
        images: [],
        available: true,
      } as Apartment;

      return calculatePrice({
        apartment: apt,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        adults,
        children,
        dogs,
        overrides: {
          seasonConfigs,
          seasonPeriods,
          localTaxPerNight: taxConfig.localTaxPerNight,
          vatRate: taxConfig.vatRate,
        },
      });
    } catch {
      return null;
    }
  }, [selectedApartment, checkIn, checkOut, adults, children, dogs, seasonConfigs, seasonPeriods, taxConfig]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!apartmentId) errs.apartmentId = "Bitte Wohnung wählen";
    if (!checkIn) errs.checkIn = "Bitte Anreisedatum wählen";
    if (!checkOut) errs.checkOut = "Bitte Abreisedatum wählen";
    if (checkIn && checkOut && checkIn >= checkOut) errs.checkOut = "Abreise muss nach Anreise liegen";
    if (!firstName.trim()) errs.firstName = "Pflichtfeld";
    if (!lastName.trim()) errs.lastName = "Pflichtfeld";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Ungültige E-Mail";
    if (!phone.trim()) errs.phone = "Pflichtfeld";
    if (!street.trim()) errs.street = "Pflichtfeld";
    if (!zip.trim()) errs.zip = "Pflichtfeld";
    if (!city.trim()) errs.city = "Pflichtfeld";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createManualBooking({
        apartment_id: apartmentId,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        dogs,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        street: street.trim(),
        zip: zip.trim(),
        city: city.trim(),
        country,
        notes: notes.trim() || undefined,
        status,
        send_confirmation: sendConfirmation,
      });

      if (result.success && result.bookingId) {
        router.push(`/admin/buchungen/${result.bookingId}`);
      } else {
        setSubmitError(result.error ?? "Ein Fehler ist aufgetreten.");
      }
    } catch {
      setSubmitError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Apartment & Dates */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Aufenthalt</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Wohnung <span className="text-red-400">*</span>
          </label>
          <select
            value={apartmentId}
            onChange={(e) => setApartmentId(e.target.value)}
            className={inputClasses}
          >
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (max. {a.maxGuests} Gäste)
              </option>
            ))}
          </select>
          {errors.apartmentId && (
            <p className="text-red-500 text-xs mt-1">{errors.apartmentId}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Anreise <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={`${inputClasses} ${errors.checkIn ? "border-red-300 bg-red-50" : ""}`}
            />
            {errors.checkIn && (
              <p className="text-red-500 text-xs mt-1">{errors.checkIn}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Abreise <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className={`${inputClasses} ${errors.checkOut ? "border-red-300 bg-red-50" : ""}`}
            />
            {errors.checkOut && (
              <p className="text-red-500 text-xs mt-1">{errors.checkOut}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Erwachsene
            </label>
            <select
              value={adults}
              onChange={(e) => setAdults(parseInt(e.target.value))}
              className={inputClasses}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Kinder
            </label>
            <select
              value={children}
              onChange={(e) => setChildren(parseInt(e.target.value))}
              className={inputClasses}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hunde
            </label>
            <select
              value={dogs}
              onChange={(e) => setDogs(parseInt(e.target.value))}
              className={inputClasses}
            >
              {[0, 1, 2].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Guest Details */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">Gastdaten</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Vorname"
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
            required
          />
          <Field
            label="Nachname"
            value={lastName}
            onChange={setLastName}
            error={errors.lastName}
            required
          />
          <Field
            label="E-Mail"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            placeholder="Optional"
          />
          <Field
            label="Telefon"
            type="tel"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Straße & Hausnummer"
              value={street}
              onChange={setStreet}
              error={errors.street}
              required
            />
          </div>
          <Field
            label="PLZ"
            value={zip}
            onChange={setZip}
            error={errors.zip}
            required
          />
          <Field
            label="Ort"
            value={city}
            onChange={setCity}
            error={errors.city}
            required
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Land
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClasses}
            >
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

      {/* Notes & Status */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Optionen
        </h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Bemerkungen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Interne Notizen, besondere Wünsche..."
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "pending" | "confirmed")
              }
              className={inputClasses}
            >
              <option value="pending">Offen</option>
              <option value="confirmed">Bestätigt</option>
            </select>
          </div>
        </div>

        {email.trim() && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(e) => setSendConfirmation(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]"
            />
            <span className="text-sm text-stone-700">
              Bestätigungsmail an Gast senden
            </span>
          </label>
        )}
      </div>

      {/* Price Preview */}
      {priceBreakdown && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Preisvorschau
          </h2>
          <div className="space-y-2 text-sm">
            {priceBreakdown.seasonBreakdown.map((s) => (
              <div
                key={s.type}
                className="flex justify-between text-stone-600"
              >
                <span>
                  {s.nights} {s.nights === 1 ? "Nacht" : "Nächte"} {s.label} (
                  {formatCurrency(s.pricePerNight)}/Nacht)
                </span>
                <span>{formatCurrency(s.total)}</span>
              </div>
            ))}

            {priceBreakdown.extraGuests > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>
                  Zuschlag {priceBreakdown.extraGuests}{" "}
                  {priceBreakdown.extraGuests === 1
                    ? "Zusatzperson"
                    : "Zusatzpersonen"}{" "}
                  ({formatCurrency(priceBreakdown.extraGuestsPricePerNight)}
                  /Nacht)
                </span>
                <span>{formatCurrency(priceBreakdown.extraGuestsTotal)}</span>
              </div>
            )}

            {priceBreakdown.dogsTotal > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>
                  Hunde ({formatCurrency(priceBreakdown.dogsPricePerNight)}
                  /Nacht)
                </span>
                <span>{formatCurrency(priceBreakdown.dogsTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-600">
              <span>Endreinigung</span>
              <span>{formatCurrency(priceBreakdown.cleaningFee)}</span>
            </div>

            <div className="flex justify-between text-stone-600">
              <span>Ortstaxe</span>
              <span>{formatCurrency(priceBreakdown.localTaxTotal)}</span>
            </div>

            <div className="flex justify-between font-semibold text-stone-900 pt-2 border-t border-stone-100">
              <span>Gesamt</span>
              <span>{formatCurrency(priceBreakdown.total)}</span>
            </div>

            <div className="flex justify-between text-xs text-stone-400">
              <span>davon MwSt.</span>
              <span>{formatCurrency(priceBreakdown.vatAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-[#c8a96e] hover:bg-[#b89555] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Wird erstellt...
          </>
        ) : (
          "Buchung erstellen"
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClasses} ${error ? "border-red-300 bg-red-50" : ""}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
