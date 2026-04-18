import { Metadata } from "next";
import Link from "next/link";
import { getInvoices } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";

export const metadata: Metadata = {
  title: "Rechnungen",
};

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Offen", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Bestätigt", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Abgeschlossen", className: "bg-stone-100 text-stone-600" },
  cancelled: { label: "Storniert", className: "bg-red-100 text-red-700" },
};

export default async function RechnungenPage() {
  const [invoices, nameMap] = await Promise.all([
    getInvoices(),
    getApartmentNameMap(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Rechnungen</h1>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">Noch keine Rechnungen vorhanden.</p>
          <p className="text-sm text-stone-400 mt-1">
            Rechnungsnummern werden automatisch bei Buchungsbestätigung vergeben.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Rechnungsnr.
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Gast
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">
                    Wohnung
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden md:table-cell">
                    Zeitraum
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoices.map((inv) => {
                  const apartmentName = nameMap.get(inv.apartment_id) ?? inv.apartment_id;
                  const st = statusLabels[inv.status] ?? statusLabels.pending;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-stone-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/buchungen/${inv.id}`}
                          className="font-mono text-sm font-medium text-[#c8a96e] hover:text-[#b89555]"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {inv.first_name} {inv.last_name}
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">
                        {apartmentName}
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden md:table-cell">
                        {formatDate(inv.check_in)} – {formatDate(inv.check_out)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-900">
                        {formatCurrency(Number(inv.total_price))}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/invoice/${inv.id}`}
                          download
                          className="inline-flex items-center gap-1 text-xs text-[#c8a96e] hover:text-[#b89555] font-medium"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                            />
                          </svg>
                          PDF
                        </a>
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
