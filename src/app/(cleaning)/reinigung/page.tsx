import { Metadata } from "next";
import { getCleaningBookings } from "../actions";
import CleaningList from "@/components/cleaning/CleaningList";

export const metadata: Metadata = {
  title: "Übersicht",
};

export const dynamic = "force-dynamic";

export default async function CleaningPage() {
  const bookings = await getCleaningBookings();

  return (
    <div>
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-2xl font-bold text-stone-900">
            Reinigungs-Übersicht
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Anstehende An- und Abreisen mit Personenanzahl und Hinweisen.
          </p>
        </div>
      </div>
      <CleaningList bookings={bookings} />
    </div>
  );
}
