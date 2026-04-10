import BookingWidget from "@/components/booking/BookingWidget";

export default function MobileBookingBanner() {
  return (
    <section className="md:hidden -mt-16 relative z-20 px-4 pb-6">
      <BookingWidget />
    </section>
  );
}
