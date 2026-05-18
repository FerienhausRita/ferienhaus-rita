import { Metadata } from "next";
import Link from "next/link";
import { getPaymentOverview } from "../actions";
import { getApartmentNameMap } from "@/lib/pricing-data";

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

type SortKey = "due" | "name" | "open";

function sortLink(searchParams: Record<string, string | undefined>, key: SortKey, label: string) {
  const current = (searchParams.sort as SortKey) ?? "due";
  const dir = searchParams.dir === "desc" ? "desc" : "asc";
  const isActive = current === key;
  const nextDir = isActive && dir === "asc" ? "desc" : "asc";
  const params = new URLSearchParams();
  params.set("sort", key);
  params.set("dir", nextDir);
  if (searchParams.filter === "overdue") params.set("filter", "overdue");
  return (
    <Link
      href={`/admin/zahlungen?${params.toString()}`}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
        isActive ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
    >
      {label} {isActive && (dir === "asc" ? "↑" : "↓")}
    </Link>
  );
}

export default async function ZahlungenPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string; filter?: string };
}) {
  // Map UI sort keys to action sort columns
  const sortKey = (searchParams.sort as SortKey) ?? "due";
  const dbSort =
    sortKey === "name" ? "last_name" : sortKey === "open" ? "remainder_amount" : "deposit_due_date";

  const filter = searchParams.filter === "overdue" ? "overdue" : "all";

  const [{ bookings: allBookings, overdueCount, overdueBookingCount, totalOutstanding, totalOverdue }, nameMap] = await Promise.all([
    getPaymentOverview(dbSort, searchParams.dir),
    getApartmentNameMap(),
  ]);
  const sp = searchParams as Record<string, string | undefined>;
  const today = new Date().toISOString().split("T")[0];

  // Filter overdue: nur Buchungen, bei denen ein Bucket bereits über Fälligkeit ist
  const bookings = filter === "overdue"
    ? allBookings.filter((b) => {
        const depositDone =
          Number(b.deposit_amount || 0) === 0 ||
          Number(b.deposit_open || 0) <= 0.01 ||
          !!b.deposit_paid_at;
        const remainderDone =
          Number(b.remainder_amount || 0) === 0 ||
          Number(b.remainder_open || 0) <= 0.01 ||
          !!b.remainder_paid_at;
        const dOverdue = !!(b.deposit_due_date && b.deposit_due_date < today && !depositDone);
        const rOverdue = !!(b.remainder_due_date && b.remainder_due_date < today && !remainderDone);
        return dOverdue || rOverdue;
      })
    : allBookings;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Zahlungen</h1>

      {/* KPI Cards — klickbar, filtern die Liste unten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Insgesamt offen — alle ausstehenden Beträge, auch noch nicht fällige */}
        <Link
          href="/admin/zahlungen"
          className={`block rounded-2xl border p-5 transition-colors hover:border-[#c8a96e]/40 ${
            filter === "all" ? "bg-white border-stone-300 ring-2 ring-[#c8a96e]/30" : "bg-white border-stone-200"
          }`}
        >
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Insgesamt offen</p>
          <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalOutstanding)}</p>
          <p className="text-[11px] text-stone-400 mt-1">inkl. noch nicht f&auml;lliger Betr&auml;ge</p>
        </Link>

        {/* Überfällig — Betrag */}
        <Link
          href="/admin/zahlungen?filter=overdue"
          className={`block rounded-2xl border p-5 transition-colors hover:border-red-300 ${
            filter === "overdue" && totalOverdue > 0
              ? "bg-red-50 border-red-300 ring-2 ring-red-200"
              : totalOverdue > 0
              ? "bg-red-50 border-red-200"
              : "bg-white border-stone-200"
          }`}
        >
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">&Uuml;berf&auml;llig (Betrag)</p>
          <p className={`text-2xl font-bold ${totalOverdue > 0 ? "text-red-600" : "text-stone-900"}`}>
            {formatCurrency(totalOverdue)}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">F&auml;lligkeit bereits &uuml;berschritten</p>
        </Link>

        {/* Überfällig — Anzahl Buchungen */}
        <Link
          href="/admin/zahlungen?filter=overdue"
          className={`block rounded-2xl border p-5 transition-colors hover:border-red-300 ${
            filter === "overdue" && overdueCount > 0
              ? "bg-red-50 border-red-300 ring-2 ring-red-200"
              : overdueCount > 0
              ? "bg-red-50 border-red-200"
              : "bg-white border-stone-200"
          }`}
        >
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">&Uuml;berf&auml;llige Buchungen</p>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-stone-900"}`}>{overdueBookingCount}</p>
          <p className="text-[11px] text-stone-400 mt-1">
            {overdueCount === overdueBookingCount
              ? `${overdueCount} fällige${overdueCount === 1 ? "r" : ""} Posten`
              : `${overdueCount} fällige Posten (Anzahlung + Restbetrag)`}
          </p>
        </Link>

        {/* Offene Buchungen gesamt */}
        <Link
          href="/admin/zahlungen"
          className={`block rounded-2xl border p-5 transition-colors hover:border-[#c8a96e]/40 ${
            filter === "all" ? "bg-white border-stone-300 ring-2 ring-[#c8a96e]/30" : "bg-white border-stone-200"
          }`}
        >
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Offene Buchungen</p>
          <p className="text-2xl font-bold text-stone-900">{allBookings.length}</p>
          <p className="text-[11px] text-stone-400 mt-1">Noch nicht voll bezahlt</p>
        </Link>
      </div>

      {/* Aktiver Filter */}
      {filter === "overdue" && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-700">
            <span className="font-medium">Gefiltert:</span> Nur überfällige Buchungen ({bookings.length})
          </p>
          <Link
            href="/admin/zahlungen"
            className="text-xs font-medium text-red-700 hover:text-red-900 underline"
          >
            Filter entfernen
          </Link>
        </div>
      )}

      {/* Sort */}
      {bookings.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-stone-500 uppercase tracking-wider mr-1">Sortieren:</span>
          {sortLink(sp, "due", "Fälligkeit")}
          {sortLink(sp, "name", "Name")}
          {sortLink(sp, "open", "Offener Betrag")}
        </div>
      )}

      {/* Payment Cards */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500">
            {filter === "overdue"
              ? "Keine überfälligen Zahlungen — alles im grünen Bereich."
              : "Keine offenen Zahlungen"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
            const depositOverdue = !!(b.deposit_due_date && b.deposit_due_date < today && !depositDone);
            const remainderOverdue = !!(b.remainder_due_date && b.remainder_due_date < today && !remainderDone);
            const anyOverdue = depositOverdue || remainderOverdue;

            const status: "paid" | "partial" | "overdue" | "open" =
              b.payment_status === "paid"
                ? "paid"
                : b.payment_status === "deposit_paid" || depositPaid > 0.01 || depositDone
                ? "partial"
                : anyOverdue
                ? "overdue"
                : "open";

            const statusLabel =
              status === "paid"
                ? "Bezahlt"
                : status === "partial"
                ? "Teilweise"
                : status === "overdue"
                ? "Überfällig"
                : "Offen";
            const statusClasses =
              status === "paid"
                ? "bg-emerald-100 text-emerald-700"
                : status === "partial"
                ? "bg-amber-100 text-amber-700"
                : status === "overdue"
                ? "bg-red-100 text-red-700"
                : "bg-stone-100 text-stone-600";

            const borderColor =
              status === "overdue"
                ? "border-l-red-500"
                : status === "partial"
                ? "border-l-amber-400"
                : status === "paid"
                ? "border-l-emerald-500"
                : "border-l-stone-300";

            const bucketRow = (
              label: string,
              amount: number,
              paid: number,
              done: boolean,
              overdue: boolean,
              dueDate: string | null | undefined
            ) => {
              if (amount === 0) return null;
              const hasPayments = paid > 0.01;
              const partial = hasPayments && !done;
              const amountColor = done
                ? "text-emerald-600"
                : overdue
                ? "text-red-600"
                : "text-stone-900";
              const icon = done ? "✓" : partial ? "🟠" : overdue ? "⚠" : null;

              return (
                <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-stone-500 w-20 shrink-0">{label}</span>
                    {dueDate && (
                      <span className={`text-xs ${overdue ? "text-red-500" : "text-stone-400"}`}>
                        f&auml;llig {formatDate(dueDate)}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium whitespace-nowrap ${amountColor}`}>
                    {partial && (
                      <span className="text-xs text-stone-500 font-normal">
                        {formatCurrency(paid)} von
                      </span>
                    )}
                    <span>{formatCurrency(amount)}</span>
                    {icon && <span className="text-base">{icon}</span>}
                  </div>
                </div>
              );
            };

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border border-stone-200 border-l-4 ${borderColor} p-4 sm:p-5 hover:shadow-sm transition`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/buchungen/${b.id}`}
                      className="text-base font-semibold text-stone-900 hover:text-[#c8a96e] truncate block"
                    >
                      {b.first_name} {b.last_name}
                    </Link>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {apartmentName} &middot; {formatDate(b.check_in)} &ndash; {formatDate(b.check_out)}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Buckets */}
                <div className="divide-y divide-stone-100 border-t border-stone-100 pt-1">
                  {bucketRow("Anzahlung", depositAmount, depositPaid, depositDone, depositOverdue, b.deposit_due_date)}
                  {bucketRow("Restbetrag", remainderAmount, remainderPaid, remainderDone, remainderOverdue, b.remainder_due_date)}
                </div>

                {/* Footer total */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-sm">
                  <span className="text-stone-500">Offen gesamt</span>
                  {totalOpen > 0.01 ? (
                    <span className={`font-bold ${anyOverdue ? "text-red-600" : "text-stone-900"}`}>
                      {formatCurrency(totalOpen)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(0)} &middot; vollst&auml;ndig bezahlt
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
