import { Metadata } from "next";
import { getFinanceOverview } from "../actions";
import { getAllApartmentsWithPricing } from "@/lib/pricing-data";
import { formatCurrency } from "@/lib/pricing";
import { todayISO } from "@/lib/dates";
import FinancePeriodFilter from "@/components/admin/FinancePeriodFilter";
import ExpenseManager from "@/components/admin/ExpenseManager";

export const metadata: Metadata = { title: "Finanzen" };

export const dynamic = "force-dynamic";

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "profit" | "cost" }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${
          accent === "profit" ? "text-emerald-700" : accent === "cost" ? "text-red-600" : "text-stone-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={muted ? "text-stone-500" : "text-stone-700"}>{label}</span>
      <span className={`font-medium ${muted ? "text-stone-500" : "text-stone-900"}`}>{value}</span>
    </div>
  );
}

export default async function FinanzenPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const currentYear = Number(todayISO().slice(0, 4));
  const year = searchParams.year ? Number(searchParams.year) : currentYear;
  const month = searchParams.month ? Number(searchParams.month) : null;

  const [overview, apartments] = await Promise.all([
    getFinanceOverview({ year, month }),
    getAllApartmentsWithPricing(),
  ]);

  const aptList = apartments.map((a) => ({ id: a.id, name: a.name }));
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const defaultExpenseDate = todayISO();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Finanzen</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {overview.bookingCount} Buchung(en) im Zeitraum · Umsatz nach Anreisedatum.
          </p>
        </div>
        <FinancePeriodFilter year={year} month={month} years={years} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Bruttoumsatz" value={formatCurrency(overview.income.gross)} />
        <Kpi label="Provisionen" value={formatCurrency(overview.commissions)} accent="cost" />
        <Kpi label="Netto-Umsatz" value={formatCurrency(overview.netRevenue)} />
        <Kpi label="Ausgaben" value={formatCurrency(overview.totalExpenses)} accent="cost" />
        <Kpi label="Gewinn" value={formatCurrency(overview.profit)} accent="profit" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Einnahmen-Aufschlüsselung */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Einnahmen</h2>
          <Row label="Übernachtungen" value={formatCurrency(overview.income.accommodation)} />
          <Row label="Endreinigung" value={formatCurrency(overview.income.cleaning)} />
          <Row label="Zusatzgäste" value={formatCurrency(overview.income.extraGuests)} />
          <Row label="Hunde" value={formatCurrency(overview.income.dogs)} />
          {overview.income.discounts > 0 && (
            <Row label="Rabatte" value={`− ${formatCurrency(overview.income.discounts)}`} />
          )}
          <div className="border-t border-stone-100 mt-1 pt-1">
            <Row label="Bruttoumsatz" value={formatCurrency(overview.income.gross)} />
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <Row label="enthaltene MwSt" value={formatCurrency(overview.vat)} muted />
            <Row label="Kurtaxe (separat, an Gemeinde)" value={formatCurrency(overview.kurtaxe)} muted />
          </div>
        </div>

        {/* Nach Kanal */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Nach Kanal</h2>
          {overview.byChannel.length === 0 ? (
            <p className="text-sm text-stone-400">Keine Buchungen im Zeitraum.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {overview.byChannel.map((c) => (
                <div key={c.channel} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-stone-700">
                    {c.channel} <span className="text-stone-400">({c.count})</span>
                  </span>
                  <span className="text-right">
                    <span className="font-medium text-stone-900">{formatCurrency(c.gross)}</span>
                    {c.commission > 0 && (
                      <span className="text-red-600 text-xs block">
                        − {formatCurrency(c.commission)} Provision
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nach Wohnung */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-2">Nach Wohnung</h2>
        {overview.byApartment.length === 0 ? (
          <p className="text-sm text-stone-400">Keine Buchungen im Zeitraum.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {overview.byApartment.map((a) => (
              <div key={a.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-stone-700">
                  {a.name} <span className="text-stone-400">({a.count} Buchung(en), {a.nights} Nächte)</span>
                </span>
                <span className="font-medium text-stone-900">{formatCurrency(a.gross)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ausgaben */}
      <ExpenseManager
        expenses={overview.expenses}
        apartments={aptList}
        defaultDate={defaultExpenseDate}
      />
    </div>
  );
}
