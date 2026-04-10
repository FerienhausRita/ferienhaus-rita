"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { apartments } from "@/data/apartments";

// Column headers as used in the export (German)
const KNOWN_HEADERS: Record<string, string> = {
  "Wohnung": "apartment_name",
  "Vorname": "first_name",
  "Nachname": "last_name",
  "E-Mail": "email",
  "Telefon": "phone",
  "Straße": "street",
  "PLZ": "zip",
  "Ort": "city",
  "Land": "country",
  "Check-in": "check_in",
  "Check-out": "check_out",
  "Nächte": "nights",
  "Erwachsene": "adults",
  "Kinder": "children",
  "Hunde": "dogs",
  "Preis/Nacht": "price_per_night",
  "Zuschlag Gäste": "extra_guests_total",
  "Zuschlag Hunde": "dogs_total",
  "Endreinigung": "cleaning_fee",
  "Ortstaxe": "local_tax_total",
  "Rabatt": "discount_amount",
  "Rabattcode": "discount_code",
  "Gesamtpreis": "total_price",
  "Status": "status",
  "Zahlungsstatus": "payment_status",
  "Rechnungsnummer": "invoice_number",
  "Anmerkungen": "notes",
};

const STATUS_MAP: Record<string, string> = {
  "anfrage": "pending",
  "offen": "pending",
  "bestätigt": "confirmed",
  "bestaetigt": "confirmed",
  "abgeschlossen": "completed",
  "storniert": "cancelled",
  "pending": "pending",
  "confirmed": "confirmed",
  "completed": "completed",
  "cancelled": "cancelled",
};

const PAYMENT_MAP: Record<string, string> = {
  "offen": "unpaid",
  "teilweise bezahlt": "partial",
  "teilweise": "partial",
  "bezahlt": "paid",
  "erstattet": "refunded",
  "unpaid": "unpaid",
  "partial": "partial",
  "paid": "paid",
  "refunded": "refunded",
};

// Resolve apartment name to ID
function resolveApartmentId(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const apt = apartments.find(
    (a) =>
      a.name.toLowerCase() === lower ||
      a.id === lower ||
      a.slug === lower
  );
  return apt?.id || null;
}

interface MappedRow {
  apartment_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  dogs: number;
  price_per_night: number;
  extra_guests_total: number;
  dogs_total: number;
  cleaning_fee: number;
  local_tax_total: number;
  discount_amount: number;
  discount_code: string;
  total_price: number;
  status: string;
  payment_status: string;
  invoice_number: string;
  notes: string;
}

interface RowError {
  row: number;
  message: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: RowError[];
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export default function ExcelImport() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<RowError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse uploaded file
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (json.length === 0) {
        alert("Die Datei enthält keine Daten.");
        return;
      }

      const fileHeaders = Object.keys(json[0]);
      setHeaders(fileHeaders);
      setRawData(json);

      // Auto-detect column mapping
      const autoMapping: Record<string, string> = {};
      for (const header of fileHeaders) {
        if (KNOWN_HEADERS[header]) {
          autoMapping[header] = KNOWN_HEADERS[header];
        }
      }
      setColumnMapping(autoMapping);
      setStep("mapping");
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Map and validate rows
  const processRows = useCallback(() => {
    const rows: MappedRow[] = [];
    const errors: RowError[] = [];

    // Invert mapping: internal field -> header
    const fieldToHeader: Record<string, string> = {};
    for (const [header, field] of Object.entries(columnMapping)) {
      if (field && field !== "__skip__") {
        fieldToHeader[field] = header;
      }
    }

    const getValue = (row: Record<string, unknown>, field: string): string => {
      const header = fieldToHeader[field];
      if (!header) return "";
      const val = row[header];
      if (val === null || val === undefined) return "";
      return String(val).trim();
    };

    const getNumber = (row: Record<string, unknown>, field: string): number => {
      const val = getValue(row, field);
      const num = parseFloat(val.replace(",", "."));
      return isNaN(num) ? 0 : num;
    };

    // Parse date - handle Excel serial dates and various formats
    const parseDate = (row: Record<string, unknown>, field: string): string => {
      const header = fieldToHeader[field];
      if (!header) return "";
      const rawVal = row[header];

      // Excel serial date number
      if (typeof rawVal === "number") {
        const date = XLSX.SSF.parse_date_code(rawVal);
        if (date) {
          return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
        }
      }

      const val = String(rawVal || "").trim();
      if (!val) return "";

      // ISO format: 2026-04-10
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);

      // German format: 10.04.2026 or 10.04.26
      const deMatch = val.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (deMatch) {
        let year = parseInt(deMatch[3]);
        if (year < 100) year += 2000;
        return `${year}-${deMatch[2].padStart(2, "0")}-${deMatch[1].padStart(2, "0")}`;
      }

      return val;
    };

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // 1-indexed + header row

      const apartmentName = getValue(row, "apartment_name");
      const apartmentId = resolveApartmentId(apartmentName);
      const email = getValue(row, "email").toLowerCase();
      const firstName = getValue(row, "first_name");
      const lastName = getValue(row, "last_name");
      const checkIn = parseDate(row, "check_in");
      const checkOut = parseDate(row, "check_out");

      // Validate required fields
      const missing: string[] = [];
      if (!apartmentId) missing.push(`Wohnung "${apartmentName}" nicht erkannt`);
      if (!email) missing.push("E-Mail fehlt");
      if (!firstName) missing.push("Vorname fehlt");
      if (!lastName) missing.push("Nachname fehlt");
      if (!checkIn) missing.push("Check-in fehlt");
      if (!checkOut) missing.push("Check-out fehlt");

      if (missing.length > 0) {
        errors.push({ row: rowNum, message: missing.join(", ") });
        continue;
      }

      // Calculate nights if not provided
      let nights = Math.round(getNumber(row, "nights"));
      if (!nights && checkIn && checkOut) {
        const d1 = new Date(checkIn);
        const d2 = new Date(checkOut);
        nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      }
      if (nights <= 0) {
        errors.push({ row: rowNum, message: "Ungültiger Zeitraum (Nächte ≤ 0)" });
        continue;
      }

      const statusRaw = getValue(row, "status").toLowerCase();
      const paymentRaw = getValue(row, "payment_status").toLowerCase();

      rows.push({
        apartment_id: apartmentId!,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: getValue(row, "phone"),
        street: getValue(row, "street"),
        zip: getValue(row, "zip"),
        city: getValue(row, "city"),
        country: getValue(row, "country") || "AT",
        check_in: checkIn,
        check_out: checkOut,
        nights,
        adults: Math.max(1, Math.round(getNumber(row, "adults")) || 2),
        children: Math.round(getNumber(row, "children")),
        dogs: Math.round(getNumber(row, "dogs")),
        price_per_night: getNumber(row, "price_per_night"),
        extra_guests_total: getNumber(row, "extra_guests_total"),
        dogs_total: getNumber(row, "dogs_total"),
        cleaning_fee: getNumber(row, "cleaning_fee"),
        local_tax_total: getNumber(row, "local_tax_total"),
        discount_amount: getNumber(row, "discount_amount"),
        discount_code: getValue(row, "discount_code"),
        total_price: getNumber(row, "total_price"),
        status: STATUS_MAP[statusRaw] || "confirmed",
        payment_status: PAYMENT_MAP[paymentRaw] || "unpaid",
        invoice_number: getValue(row, "invoice_number"),
        notes: getValue(row, "notes"),
      });
    }

    setMappedRows(rows);
    setValidationErrors(errors);
    setStep("preview");
  }, [rawData, columnMapping]);

  // Submit to API
  const handleImport = useCallback(async () => {
    setImporting(true);
    setStep("importing");

    try {
      const response = await fetch("/api/import/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, filename: fileName }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import fehlgeschlagen");
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep("done");
    } catch (err) {
      alert(`Fehler: ${err}`);
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }, [mappedRows, fileName]);

  const reset = () => {
    setStep("upload");
    setFileName("");
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setMappedRows([]);
    setValidationErrors([]);
    setImportResult(null);
  };

  const targetFields = [
    { value: "__skip__", label: "-- Ignorieren --" },
    ...Object.entries(KNOWN_HEADERS).map(([, v]) => ({
      value: v,
      label: Object.entries(KNOWN_HEADERS).find(([, val]) => val === v)?.[0] || v,
    })),
  ];

  // Deduplicate
  const uniqueFields = targetFields.filter(
    (f, i, arr) => arr.findIndex((a) => a.value === f.value) === i
  );

  return (
    <div>
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#c8a96e] bg-[#c8a96e]/5"
              : "border-stone-300 hover:border-[#c8a96e]/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <svg className="w-12 h-12 mx-auto text-stone-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-stone-600 font-medium">
            Excel-Datei hierher ziehen oder klicken
          </p>
          <p className="text-stone-400 text-sm mt-1">
            Unterstützt: .xlsx, .xls, .csv
          </p>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Spalten-Zuordnung</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {fileName} – {rawData.length} Zeilen erkannt
              </p>
            </div>
            <button onClick={reset} className="text-xs text-stone-400 hover:text-stone-600">
              Andere Datei
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-stone-500 font-medium">Excel-Spalte</th>
                    <th className="text-left px-4 py-2 text-xs text-stone-500 font-medium">Beispielwert</th>
                    <th className="text-left px-4 py-2 text-xs text-stone-500 font-medium">Zuordnung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {headers.map((header) => (
                    <tr key={header}>
                      <td className="px-4 py-2 font-medium text-stone-700">{header}</td>
                      <td className="px-4 py-2 text-stone-400 text-xs max-w-[200px] truncate">
                        {String(rawData[0]?.[header] ?? "")}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={columnMapping[header] || "__skip__"}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [header]: e.target.value,
                            }))
                          }
                          className="text-xs border border-stone-200 rounded-lg px-2 py-1 w-full max-w-[200px]"
                        >
                          {uniqueFields.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
            >
              Abbrechen
            </button>
            <button
              onClick={processRows}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Vorschau anzeigen
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Import-Vorschau</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {mappedRows.length} gültige Zeilen{validationErrors.length > 0 && `, ${validationErrors.length} Fehler`}
              </p>
            </div>
            <button onClick={() => setStep("mapping")} className="text-xs text-stone-400 hover:text-stone-600">
              Zurück zur Zuordnung
            </button>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-medium text-red-800 mb-2">
                {validationErrors.length} Zeile{validationErrors.length !== 1 ? "n" : ""} übersprungen:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {validationErrors.map((err) => (
                  <p key={err.row} className="text-xs text-red-600">
                    Zeile {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {mappedRows.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden mb-4">
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Wohnung</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Gast</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">E-Mail</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Zeitraum</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Nächte</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Gäste</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Gesamt</th>
                      <th className="text-left px-3 py-2 text-stone-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {mappedRows.slice(0, 50).map((row, i) => {
                      const apt = apartments.find((a) => a.id === row.apartment_id);
                      return (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="px-3 py-1.5 text-stone-400">{i + 1}</td>
                          <td className="px-3 py-1.5 text-stone-700">{apt?.name || row.apartment_id}</td>
                          <td className="px-3 py-1.5 text-stone-700">{row.first_name} {row.last_name}</td>
                          <td className="px-3 py-1.5 text-stone-500">{row.email}</td>
                          <td className="px-3 py-1.5 text-stone-500 whitespace-nowrap">{row.check_in} – {row.check_out}</td>
                          <td className="px-3 py-1.5 text-stone-500">{row.nights}</td>
                          <td className="px-3 py-1.5 text-stone-500">{row.adults}E {row.children > 0 ? `${row.children}K ` : ""}{row.dogs > 0 ? `${row.dogs}H` : ""}</td>
                          <td className="px-3 py-1.5 text-stone-700 font-medium">{row.total_price.toFixed(2)} €</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              row.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                              row.status === "completed" ? "bg-stone-100 text-stone-600" :
                              row.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {mappedRows.length > 50 && (
                <p className="text-xs text-stone-400 px-3 py-2 bg-stone-50 border-t border-stone-100">
                  Zeige 50 von {mappedRows.length} Zeilen
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
            >
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={mappedRows.length === 0}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
            >
              {mappedRows.length} Buchung{mappedRows.length !== 1 ? "en" : ""} importieren
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <div className="text-center py-12">
          <svg className="w-8 h-8 mx-auto text-[#c8a96e] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-stone-600 font-medium">Importiere {mappedRows.length} Buchungen...</p>
          <p className="text-stone-400 text-sm mt-1">Bitte warten</p>
        </div>
      )}

      {/* Step 5: Done */}
      {step === "done" && importResult && (
        <div>
          <div className="text-center py-8 mb-4">
            <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-1">Import abgeschlossen</h3>
            <p className="text-stone-500 text-sm">
              {importResult.imported} importiert, {importResult.skipped} übersprungen
              {importResult.errors.length > 0 && `, ${importResult.errors.length} Fehler`}
            </p>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-medium text-red-800 mb-2">Fehler beim Import:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">
                    Zeile {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
            >
              Weitere Datei importieren
            </button>
            <a
              href="/admin/buchungen"
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Zu den Buchungen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
