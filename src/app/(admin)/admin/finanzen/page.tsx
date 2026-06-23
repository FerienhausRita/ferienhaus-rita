import { Metadata } from "next";
import Link from "next/link";
import { getFinanceOverview, getOrtstaxeReport, getBookingYears, getOpenDraftCount } from "../actions";
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

  const [overview, ortstaxe, apartments, yearBounds, draftCount] = await Promise.all([
    getFinanceOverview({ year, month }),
    getOrtstaxeReport({ year, month }),
    getAllApartmentsWithPricing(),
    getBookingYears(),
    getOpenDraftCount(),
  ]);

  const aptList = apartments.map((a) => ({ id: a.id, name: a.name }));
  // Jahre datengetrieben: vom spätesten Buchungsjahr bis frühestes (mind. 3 Jahre).
  const topYear = Math.max(yearBounds.max, currentYear);
  const bottomYear = Math.min(yearBounds.min, currentYear - 2);
  const years: number[] = [];
  for (let y = topYear; y >= bottomYear; y--) years.push(y);
  const defaultExpenseDate = todayISO();
  const exportHref = `/api/admin/finanzen/export?year=${year}${month ? `&month=${month}` : ""}`;
  const methodLabels: Record<string, string> = {
    bank_transfer: "Überweisung",
    cash: "Bar",
    card: "Karte",
    paypal: "PayPal",
    Plattform: "Plattform-Auszahlung",
    other: "Sonstige",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Finanzen</h1>
          <p className="text-stone-500 mt-1 text-sm">
            {overview.bookingCount} Buchung(en) im Zeitraum · Umsatz nach Anreisedatum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/finanzen/belege"
            className="relative inline-flex items-center gap-2 bg-white border border-stone-200 hover:border-[#c8a96e] text-stone-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Belege
            {draftCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#c8a96e] text-white text-xs font-semibold">
                {draftCount}
              </span>
            )}
          </Link>
          <FinancePeriodFilter year={year} month={month} years={years} />
          <Link
            href={exportHref}
            className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Export (CSV)
          </Link>
        </div>
      </div>

      {draftCount > 0 && (
        <Link
          href="/admin/finanzen/belege"
          className="block bg-[#c8a96e]/10 border border-[#c8a96e]/40 rounded-2xl px-5 py-3 text-sm text-stone-700 hover:bg-[#c8a96e]/15 transition-colors"
        >
          <span className="font-semibold text-stone-900">{draftCount} Beleg(e) zu prüfen.</span>{" "}
          Bitte kontrollieren und bestätigen, damit sie in die Finanzen einfließen. →
        </Link>
      )}

      {/* KPI – Ist-Sicht (tatsächlich vereinnahmt) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Vereinnahmt (Ist)" value={formatCurrency(overview.received)} />
        <Kpi label="Ausgaben" value={formatCurrency(overview.totalExpenses)} accent="cost" />
        <Kpi label="Gewinn (Ist)" value={formatCurrency(overview.profitIst)} accent="profit" />
        <Kpi label="Gebuchter Umsatz" value={formatCurrency(overview.income.gross)} />
        <Kpi label="Provisionen" value={formatCurrency(overview.commissions)} accent="cost" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vereinnahmt nach Zahlart (Ist) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Vereinnahmt nach Zahlart</h2>
          {overview.byMethod.length === 0 ? (
            <p className="text-sm text-stone-400">Keine Zahlungseingänge im Zeitraum.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {overview.byMethod.map((m) => (
                <Row key={m.method} label={methodLabels[m.method] ?? m.method} value={formatCurrency(m.amount)} />
              ))}
              <div className="border-t border-stone-200 mt-1 pt-1">
                <Row label="Summe vereinnahmt" value={formatCurrency(overview.received)} />
              </div>
            </div>
          )}
        </div>

        {/* Umsatzsteuer (Hilfswert UVA) */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Umsatzsteuer (Hilfswert)</h2>
          <Row label="Vereinnahmte USt (aus Einnahmen, 10 %)" value={formatCurrency(overview.ust.output)} />
          <Row label="Vorsteuer (aus Ausgaben)" value={`− ${formatCurrency(overview.ust.vorsteuer)}`} />
          <div className="border-t border-stone-200 mt-1 pt-1">
            <Row label="Zahllast (Richtwert)" value={formatCurrency(overview.ust.zahllast)} />
          </div>
          <p className="text-[11px] text-stone-400 mt-2">
            Unverbindlicher Hilfswert für die UVA – keine Steuerberatung. Plattform-Provisionen
            (Reverse-Charge) und USt-Sätze separater Extras mit Steuerberater klären.
          </p>
        </div>
      </div>

      {/* Ortstaxe-Meldung */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold text-stone-900">Ortstaxe (Tourismusverband)</h2>
          <span className="text-xs text-stone-400">{ortstaxe.ratePerPersonNight.toFixed(2)} € / Person·Nacht</span>
        </div>
        <Row label="Personen-Nächtigungen" value={String(ortstaxe.totalPersonNights)} />
        <div className="border-t border-stone-100 mt-1 pt-1">
          <Row label="Abzuführende Ortstaxe" value={formatCurrency(ortstaxe.totalTaxe)} />
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          Durchlaufender Posten (nicht im Umsatz). Monatlich an den Tourismusverband melden/abführen.
        </p>
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
