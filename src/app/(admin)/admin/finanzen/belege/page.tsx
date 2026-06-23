import { Metadata } from "next";
import Link from "next/link";
import { listDraftExpenses } from "../../actions";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import BelegeManager from "@/components/admin/BelegeManager";

export const metadata: Metadata = { title: "Belege" };
export const dynamic = "force-dynamic";

export default async function BelegePage() {
  const [drafts, apartments] = await Promise.all([
    listDraftExpenses(),
    getAllApartmentsWithPricing(),
  ]);
  const aptList = apartments.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Belege</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Hochladen, automatisch auslesen, prüfen und bestätigen.
          </p>
        </div>
        <Link
          href="/admin/finanzen"
          className="text-sm text-stone-600 hover:text-stone-900 underline"
        >
          ← Zur Finanzübersicht
        </Link>
      </div>

      <BelegeManager drafts={drafts} apartments={aptList} />
    </div>
  );
}
