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
                  <th className="py-3 px-4 font-medium text-right">Offen</th>
                  <SortHeader column="payment_status" label="Status" currentSort={searchParams.sort} currentDir={searchParams.dir} searchParams={sp} align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {bookings.map((b) => {
                  const apartmentName = nameMap.get(b.apartment_id) ?? b.apartment_id;
                  const depositAmount = Number(b.deposit_amount || 0);
                  const remainderAmount = Number(b.remainder_amount || 0);
                  const depositPaid = Number(b.deposit_paid_sum || 0);
                  const remainderPaid = Number(b.remainder_paid_sum || 0);
                  const depositOpen = Number(b.deposit_open || 0);
                  const remainderOpen = Number(b.remainder_open || 0);
                  const totalOpen = Number(b.total_open || 0);
                  const depositDone = depositAmount === 0 || depositOpen <= 0.01 || !!b.deposit_paid_at;
                  const remainderDone = remainderAmount === 0 || remainderOpen <= 0.01 || !!b.remainder_paid_at;
                  const depositOverdue =
                    b.deposit_due_date && b.deposit_due_date < today && !depositDone;
                  const remainderOverdue =
                    b.remainder_due_date && b.remainder_due_date < today && !remainderDone;

                  const bucketCell = (
                    amount: number,
                    paid: number,
                    done: boolean,
                    overdue: boolean,
                    dueDate: string | null | undefined
                  ) => {
                    if (amount === 0) return <span className="text-stone-300">&ndash;</span>;
                    const hasPayments = paid > 0.01;
                    return (
                      <div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`font-medium ${
                              done ? "text-emerald-600" : overdue ? "text-red-600" : "text-stone-900"
                            }`}
                          >
                            {formatCurrency(paid)} / {formatCurrency(amount)}
                          </span>
                          {done && <span className="text-emerald-600">✓</span>}
                          {!done && hasPayments && <span>🟠</span>}
                        </div>
                        {!done && dueDate && (
                          <p
                            className={`text-xs ${
                              overdue ? "text-red-500" : "text-stone-400"
                            }`}
                          >
                            bis {formatDate(dueDate)}
                          </p>
                        )}
                        {done && paid > 0 && (
                          <p className="text-xs text-emerald-500">bezahlt</p>
                        )}
                      </div>
                    );
                  };

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
                        {bucketCell(depositAmount, depositPaid, depositDone, !!depositOverdue, b.deposit_due_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {bucketCell(remainderAmount, remainderPaid, remainderDone, !!remainderOverdue, b.remainder_due_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {totalOpen > 0.01 ? (
                          <span className={`font-bold ${depositOverdue || remainderOverdue ? "text-red-600" : "text-stone-900"}`}>
                            {formatCurrency(totalOpen)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">0 €</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : b.payment_status === "deposit_paid" || depositPaid > 0.01
                            ? "bg-amber-100 text-amber-700"
                            : (depositOverdue || remainderOverdue)
                            ? "bg-red-100 text-red-700"
                            : "bg-stone-100 text-stone-600"
                        }`}>
                          {b.payment_status === "paid" ? "Bezahlt"
                            : b.payment_status === "deposit_paid" || depositPaid > 0.01 ? "Teilweise"
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
