"use client";

import { useState } from "react";
import { updateBookingGuestData } from "@/app/(admin)/admin/actions";

interface GuestDataEditorProps {
  bookingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
}

export default function GuestDataEditor({
  bookingId,
  firstName: initFirstName,
  lastName: initLastName,
  email: initEmail,
  phone: initPhone,
  street: initStreet,
  zip: initZip,
  city: initCity,
  country: initCountry,
}: GuestDataEditorProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initFirstName);
  const [lastName, setLastName] = useState(initLastName);
  const [email, setEmail] = useState(initEmail);
  const [phone, setPhone] = useState(initPhone);
  const [street, setStreet] = useState(initStreet);
  const [zip, setZip] = useState(initZip);
  const [city, setCity] = useState(initCity);
  const [country, setCountry] = useState(initCountry);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    const result = await updateBookingGuestData(bookingId, {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      street: street.trim(),
      zip: zip.trim(),
      city: city.trim(),
      country: country.trim(),
    });
    setLoading(false);
    if (result.success) {
      setMessage("Gespeichert");
      setEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(result.error || "Fehler beim Speichern");
    }
  };

  const handleCancel = () => {
    setFirstName(initFirstName);
    setLastName(initLastName);
    setEmail(initEmail);
    setPhone(initPhone);
    setStreet(initStreet);
    setZip(initZip);
    setCity(initCity);
    setCountry(initCountry);
    setEditing(false);
    setMessage(null);
  };

  const inputClass =
    "w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";
  const labelClass = "text-xs text-stone-500 uppercase tracking-wider mb-1";

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">G&auml;stedaten</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
          >
            Bearbeiten
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className={labelClass}>Name</p>
              <p className="font-medium text-stone-900">{firstName} {lastName}</p>
            </div>
            <div>
              <p className={labelClass}>E-Mail</p>
              {email ? (
                <a href={`mailto:${email}`} className="font-medium text-[#c8a96e] hover:text-[#b89555] text-sm">
                  {email}
                </a>
              ) : (
                <p className="text-sm text-stone-400">Keine E-Mail</p>
              )}
            </div>
            <div>
              <p className={labelClass}>Telefon</p>
              {phone ? (
                <a href={`tel:${phone}`} className="font-medium text-[#c8a96e] hover:text-[#b89555] text-sm">
                  {phone}
                </a>
              ) : (
                <p className="text-sm text-stone-400">Kein Telefon</p>
              )}
            </div>
            <div>
              <p className={labelClass}>Adresse</p>
              <p className="text-stone-900 text-sm">
                {street || "-"}<br />
                {zip} {city}{country ? `, ${country}` : ""}
              </p>
            </div>
          </div>
          {message && <p className="text-xs text-emerald-600">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#c8a96e]/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="font-semibold text-stone-900">G&auml;stedaten bearbeiten</h2>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Vorname</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nachname</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Stra&szlig;e</label>
            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PLZ</label>
            <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ort</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Land</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Speichern"}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
          >
            Abbrechen
          </button>
          {message && <p className="text-xs text-red-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
