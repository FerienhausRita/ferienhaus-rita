import { apartments } from "@/data/apartments";
import ApartmentCard from "@/components/apartments/ApartmentCard";

export default function ApartmentOverview() {
  return (
    <section className="py-24 sm:py-32" id="wohnungen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
            Unterkunft
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mt-4 tracking-tight">
            Unsere Wohnungen
          </h2>
          <p className="mt-6 text-stone-500 text-lg max-w-xl mx-auto font-light">
            Vier individuell eingerichtete Ferienwohnungen – von der gemütlichen
            Auszeit für Zwei bis zum großzügigen Familiendomizil.
          </p>
        </div>

        {/* Apartment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      </div>
    </section>
  );
}
