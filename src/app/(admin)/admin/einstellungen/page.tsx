import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export default function EinstellungenPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-4">Einstellungen</h1>
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="text-stone-500">Kommt bald in Phase 2-4</p>
      </div>
    </div>
  );
}
