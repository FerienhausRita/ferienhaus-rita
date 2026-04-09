import { Metadata } from "next";
import Link from "next/link";
import ExcelImport from "@/components/admin/ExcelImport";

export const metadata: Metadata = {
  title: "Buchungen importieren",
};

export default function ImportPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/buchungen"
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          &larr; Zurück zu Buchungen
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-2">
          Buchungen importieren
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Importieren Sie bestehende Buchungen aus einer Excel-Datei. Das Format
          sollte dem Export entsprechen. Duplikate (gleiche Wohnung, Zeitraum und
          E-Mail) werden automatisch erkannt und übersprungen.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <ExcelImport />
      </div>
    </div>
  );
}
