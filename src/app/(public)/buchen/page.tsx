import { Metadata } from "next";
import { Suspense } from "react";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Buchen",
  description:
    "Prüfen Sie die Verfügbarkeit und buchen Sie Ihre Ferienwohnung in Kals am Großglockner direkt beim Gastgeber.",
};

export default function BuchenPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-24 min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-stone-400">Laden...</div>
        </div>
      }
    >
      <BookingFlow />
    </Suspense>
  );
}
