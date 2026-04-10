import BookingWidget from "@/components/booking/BookingWidget";

export default function MobileBookingBanner() {
  return (
    <section className="md:hidden bg-white py-8 px-4">
      <div className="max-w-md mx-auto">
        <p className="text-stone-500 text-xs font-medium tracking-[0.2em] uppercase text-center mb-5">
          Verfügbarkeit prüfen
        </p>
        <div className="space-y-4">
          <BookingWidget />
        </div>
      </div>
    </section>
  );
}
