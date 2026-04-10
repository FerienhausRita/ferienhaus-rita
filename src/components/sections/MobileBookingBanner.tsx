import BookingWidget from "@/components/booking/BookingWidget";

export default function MobileBookingBanner() {
  return (
    <section className="md:hidden bg-stone-100 py-6 px-5">
      <div className="max-w-md mx-auto">
        <p className="text-stone-500 text-xs font-medium tracking-[0.2em] uppercase text-center mb-4">
          Verfügbarkeit prüfen
        </p>
        <BookingWidget compact />
      </div>
    </section>
  );
}
