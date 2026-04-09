"use client";

import { useState } from "react";
import { submitMeldeschein } from "@/app/(admin)/admin/actions";

// Common nationalities for Austrian vacation rental guests
const TOP_NATIONALITIES = [
  { code: "AT", label: "Österreich" },
  { code: "DE", label: "Deutschland" },
  { code: "CH", label: "Schweiz" },
  { code: "IT", label: "Italien" },
  { code: "NL", label: "Niederlande" },
  { code: "CZ", label: "Tschechien" },
  { code: "PL", label: "Polen" },
  { code: "HU", label: "Ungarn" },
  { code: "SK", label: "Slowakei" },
  { code: "SI", label: "Slowenien" },
  { code: "HR", label: "Kroatien" },
  { code: "GB", label: "Großbritannien" },
  { code: "FR", label: "Frankreich" },
  { code: "BE", label: "Belgien" },
  { code: "DK", label: "Dänemark" },
  { code: "SE", label: "Schweden" },
  { code: "US", label: "USA" },
];

const ID_TYPES = [
  { value: "id_card", label: "Personalausweis" },
  { value: "passport", label: "Reisepass" },
  { value: "drivers_license", label: "Führerschein" },
];

interface Companion {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
}

interface MeldescheinFormProps {
  bookingId: string;
  prefill: {
    first_name: string;
    last_name: string;
    street: string;
    zip: string;
    city: string;
    country: string;
    arrival_date: string;
    departure_date: string;
  };
}

export default function MeldescheinForm({
  bookingId,
  prefill,
}: MeldescheinFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Primary guest
  const [firstName, setFirstName] = useState(prefill.first_name);
  const [lastName, setLastName] = useState(prefill.last_name);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("AT");
  const [idType, setIdType] = useState<"passport" | "id_card" | "drivers_license">("id_card");
  const [idNumber, setIdNumber] = useState("");
  const [street, setStreet] = useState(prefill.street);
  const [zip, setZip] = useState(prefill.zip);
  const [city, setCity] = useState(prefill.city);
  const [country, setCountry] = useState(prefill.country || "AT");

  // Companions
  const [companions, setCompanions] = useState<Companion[]>([]);

  function addCompanion() {
    setCompanions([
      ...companions,
      { first_name: "", last_name: "", date_of_birth: "", nationality: "AT" },
    ]);
  }

  function removeCompanion(index: number) {
    setCompanions(companions.filter((_, i) => i !== index));
  }

  function updateCompanion(index: number, field: keyof Companion, value: string) {
    setCompanions(
      companions.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!firstName || !lastName || !dateOfBirth || !idNumber || !street || !zip || !city) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    for (let i = 0; i < companions.length; i++) {
      const c = companions[i];
      if (!c.first_name || !c.last_name || !c.date_of_birth) {
        setError(`Bitte füllen Sie alle Felder für Mitreisende/n ${i + 1} aus.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await submitMeldeschein(bookingId, {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        nationality,
        id_type: idType,
        id_number: idNumber,
        street,
        zip,
        city,
        country,
        companions,
        arrival_date: prefill.arrival_date,
        departure_date: prefill.departure_date,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Fehler beim Speichern.");
      }
    } catch {
      setError("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-stone-900 mb-2">
          Meldeschein erfolgreich eingereicht
        </h3>
        <p className="text-stone-500">
          Vielen Dank! Ihre Daten wurden gespeichert.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-alpine-500/20 focus:border-alpine-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-stone-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Primary guest */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Hauptgast</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vorname *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Nachname *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Geburtsdatum *</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Staatsangehörigkeit *</label>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={inputClass}
            >
              {TOP_NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ID Document */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Ausweisdokument</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Dokumentart *</label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value as typeof idType)}
              className={inputClass}
            >
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Dokumentnummer *</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className={inputClass}
              placeholder="z.B. C01X00T47"
              required
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Wohnadresse</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Straße *</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>PLZ *</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Ort *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Land</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            >
              {TOP_NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Companions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">Mitreisende</h3>
          <button
            type="button"
            onClick={addCompanion}
            className="text-sm text-alpine-600 hover:text-alpine-700 font-medium"
          >
            + Mitreisende/n hinzufügen
          </button>
        </div>

        {companions.length === 0 && (
          <p className="text-sm text-stone-400 italic">
            Keine Mitreisenden angegeben.
          </p>
        )}

        <div className="space-y-4">
          {companions.map((companion, index) => (
            <div
              key={index}
              className="bg-stone-50 rounded-xl p-4 border border-stone-100"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-stone-600">
                  Mitreisende/r {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCompanion(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Vorname *</label>
                  <input
                    type="text"
                    value={companion.first_name}
                    onChange={(e) =>
                      updateCompanion(index, "first_name", e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Nachname *</label>
                  <input
                    type="text"
                    value={companion.last_name}
                    onChange={(e) =>
                      updateCompanion(index, "last_name", e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Geburtsdatum *</label>
                  <input
                    type="date"
                    value={companion.date_of_birth}
                    onChange={(e) =>
                      updateCompanion(index, "date_of_birth", e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Staatsangehörigkeit</label>
                  <select
                    value={companion.nationality}
                    onChange={(e) =>
                      updateCompanion(index, "nationality", e.target.value)
                    }
                    className={inputClass}
                  >
                    {TOP_NATIONALITIES.map((n) => (
                      <option key={n.code} value={n.code}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-alpine-600 hover:bg-alpine-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
      >
        {submitting ? "Wird gespeichert..." : "Meldeschein einreichen"}
      </button>

      <p className="text-xs text-stone-400 text-center">
        Ihre Daten werden ausschließlich zur Erfüllung der gesetzlichen
        Meldepflicht gem. Meldegesetz verwendet.
      </p>
    </form>
  );
}
