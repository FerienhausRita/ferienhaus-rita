import { Metadata } from "next";
import { getCalendarDataForYear } from "../actions";
import CalendarView from "@/components/admin/CalendarView";
import BlockDateForm from "@/components/admin/BlockDateForm";
import ICalDebug from "@/components/admin/ICalDebug";

export const metadata: Metadata = {
  title: "Kalender",
};

export const dynamic = "force-dynamic";

const calendarApartments = [
  { id: "grossglockner-suite", name: "Großglockner Suite" },
  { id: "gletscherblick", name: "Gletscherblick" },
  { id: "almrausch", name: "Almrausch" },
  { id: "edelweiss", name: "Edelweiß" },
];

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const currentMonth = now.getFullYear() === year ? now.getMonth() + 1 : 1;

  const { bookings, blockedDates } = await getCalendarDataForYear(year);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[100vw] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Belegungskalender</h1>
          <p className="text-stone-500 text-sm mt-1">
            Übersicht aller Wohnungen – {year}
          </p>
        </div>
        <BlockDateForm apartments={calendarApartments} />
      </div>

      <ICalDebug />

      <CalendarView
        year={year}
        currentMonth={currentMonth}
        bookings={bookings}
        blockedDates={blockedDates}
        apartments={calendarApartments}
      />
    </div>
  );
}
