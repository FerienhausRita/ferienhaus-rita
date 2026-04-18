import { Metadata } from "next";
import { getCaretakerOverview } from "../actions";
import { getAllApartmentsWithPricing, getApartmentNameMap } from "@/lib/pricing-data";
import TimelineChart from "@/components/admin/TimelineChart";
import CaretakerList from "@/components/admin/CaretakerList";
import TimeRangePicker from "@/components/admin/TimeRangePicker";
import PrintButton from "@/components/admin/PrintButton";

export const metadata: Metadata = {
  title: "Hausmeister-Übersicht",
};

export const dynamic = "force-dynamic";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateHuman(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function HausmeisterPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const daysParam = Number(searchParams.days ?? 21);
  const days = [7, 14, 21, 30, 60].includes(daysParam) ? daysParam : 21;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = today.toISOString().split("T")[0];
  const endDate = addDays(startDate, days);

  const [data, apartments, nameMap] = await Promise.all([
    getCaretakerOverview(startDate, endDate),
    getAllApartmentsWithPricing(),
    getApartmentNameMap(),
  ]);

  const apartmentRows = apartments.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto print-container">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Hausmeister-Übersicht
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Alle Belegungen im Überblick · {formatDateHuman(startDate)} –{" "}
            {formatDateHuman(endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangePicker current={days} />
          <PrintButton />
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print-only mb-6">
        <h1 className="text-2xl font-bold">Ferienhaus Rita · Belegungsübersicht</h1>
        <p className="text-sm text-stone-600 mt-1">
          Zeitraum: {formatDateHuman(startDate)} – {formatDateHuman(endDate)}{" "}
          · Stand: {new Date().toLocaleString("de-AT")}
        </p>
      </div>

      {/* Timeline */}
      <section className="mb-8 print-break-avoid">
        <TimelineChart
          apartments={apartmentRows}
          bookings={data.bookings}
          blocks={data.blocks}
          startDate={startDate}
          days={days}
        />
      </section>

      {/* Detail List */}
      <section className="print-break-before">
        <CaretakerList bookings={data.bookings} apartmentNames={nameMap} />
      </section>
    </div>
  );
}
