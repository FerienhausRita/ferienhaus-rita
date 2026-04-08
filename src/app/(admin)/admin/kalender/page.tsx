import { Metadata } from "next";
import { apartments } from "@/data/apartments";
import { getCalendarData } from "../actions";
import CalendarView from "@/components/admin/CalendarView";
import BlockDateForm from "@/components/admin/BlockDateForm";

export const metadata: Metadata = {
  title: "Kalender",
};

export const dynamic = "force-dynamic";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;

  const { bookings, blockedDates } = await getCalendarData(year, month);

  const apartmentList = apartments.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Belegungskalender</h1>
          <p className="text-stone-500 text-sm mt-1">
            Übersicht aller Wohnungen
          </p>
        </div>
        <BlockDateForm apartments={apartmentList} />
      </div>

      <CalendarView
        year={year}
        month={month}
        bookings={bookings}
        blockedDates={blockedDates}
        apartments={apartmentList}
      />
    </div>
  );
}
