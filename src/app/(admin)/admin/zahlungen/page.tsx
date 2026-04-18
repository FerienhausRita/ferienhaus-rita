import { Metadata } from "next";
import Link from "next/link";
import { getPaymentOverview } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";
import SortHeader from "@/components/admin/SortHeader";

export const metadata: Metadata = {
  title: "Zahlungen",
};

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function ZahlungenPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string };
}) {
  const [{ bookings, overdueCount, totalOutstanding }, nameMap] = await Promise.all([
    getPaymentOverview(searchParams.sort, searchParams.dir),
    getApartmentNameMap(),
  ]);
  const sp = searchParams as Record<string, string | undefined>;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Zahlungen</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Ausstehend gesamt</p>
          <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-stone-200"}`}>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">&Uuml;berf&auml;llig</p>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-stone-900"}`}>{overdueCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Offene Buchungen</p>
          <p className="text-2xl font-bold text-stone-900">{bookings.length}</p>
        </div>
      </div>

      {/* Payment Table */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">Keine offenen Zahlungen</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs text-stone-500 uppercase tracking-wider">
                  <SortHeader column="last_name" label="Gast" currentSort={searchParams.sort} currentDir={searchParams.dir} searchParams={sp} />
                  <th className="py-3 px-4 font-medium">Wohnung</th>
                  <th className="py-3 px-4 font-medium">Zeitraum</th>
                  <SortHeader column="deposit_amount" label="Anzahlung" currentSort={searchParams.sort} currentDir={searchParams.dir} searchParams={sp} align="right" />
                  <SortHeader column="remainder_amount" label="Restbetrag" currentSort={searchParams.sort} currentDir={searchParams.dir} searchParams={sp} align="right" />
                  <SortHeader column="payment_status" label="Status" currentSort={searchParams.sort} currentDir={searchParams.dir} searchParams={sp} align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {bookings.map((b) => {
                  const apartmentName = nameMap.get(b.apartment_id) ?? b.apartment_id;
                  const depositOverdue = b.deposit_due_date && b.deposit_due_date < today && !b.deposit_paid_at && Number(b.deposit_amount) > 0;
                  const remainderOverdue = b.remainder_due_date && b.remainder_due_date < today && !b.remainder_paid_at && Number(b.remainder_amount) > 0;

                  return (
                    <tr key={b.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4">
                        <Link href={`/admin/buchungen/${b.id}`} className="text-[#c8a96e] hover:text-[#b89555] font-medium">
                          {b.first_name} {b.last_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{apartmentName}</td>
                      <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                        {formatDate(b.check_in)} &ndash; {formatDate(b.check_out)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(b.deposit_amount) > 0 ? (
                          <div>
                            <span className={`font-medium ${b.deposit_paid_at ? "text-emerald-600" : depositOverdue ? "text-red-600" : "text-stone-900"}`}>
                              {formatCurrency(Number(b.deposit_amount))}
                            </span>
                            {b.deposit_due_date && !b.deposit_paid_at && (
                              <p className={`text-xs ${depositOverdue ? "text-red-500" : "text-stone-400"}`}>
                                bis {formatDate(b.deposit_due_date)}
                              </p>
                            )}
                            {b.deposit_paid_at && (
                              <p className="text-xs text-emerald-500">bezahlt</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">&ndash;</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(b.remainder_amount) > 0 ? (
                          <div>
                            <span className={`font-medium ${b.remainder_paid_at ? "text-emerald-600" : remainderOverdue ? "text-red-600" : "text-stone-900"}`}>
                              {formatCurrency(Number(b.remainder_amount))}
                            </span>
                            {b.remainder_due_date && !b.remainder_paid_at && (
                              <p className={`text-xs ${remainderOverdue ? "text-red-500" : "text-stone-400"}`}>
                                bis {formatDate(b.remainder_due_date)}
                              </p>
                            )}
                            {b.remainder_paid_at && (
                              <p className="text-xs text-emerald-500">bezahlt</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">&ndash;</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : b.payment_status === "deposit_paid"
                            ? "bg-amber-100 text-amber-700"
                            : (depositOverdue || remainderOverdue)
                            ? "bg-red-100 text-red-700"
                            : "bg-stone-100 text-stone-600"
                        }`}>
                          {b.payment_status === "paid" ? "Bezahlt"
                            : b.payment_status === "deposit_paid" ? "Anzahlung"
                            : (depositOverdue || remainderOverdue) ? "\u00dcberf\u00e4llig"
                            : "Offen"
                          }
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
