import BookingWidget from "@/components/booking/BookingWidget";

export default function MobileBookingBanner() {
  return (
    <section className="md:hidden bg-stone-900 py-6 px-4">
      <div className="max-w-lg mx-auto">
        <p className="text-white/60 text-xs font-medium tracking-[0.2em] uppercase text-center mb-4">
          Verfügbarkeit prüfen
        </p>
        <BookingWidget />
      </div>
    </section>
  );
}
