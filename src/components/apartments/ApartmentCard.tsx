import Link from "next/link";
import Image from "next/image";
import { Apartment } from "@/data/apartments";
import { formatCurrency } from "@/lib/pricing";

interface ApartmentCardProps {
  apartment: Apartment;
}

export default function ApartmentCard({ apartment }: ApartmentCardProps) {
  return (
    <Link
      href={`/wohnungen/${apartment.slug}`}
      className="group block relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-2xl"
    >
      {/* Background Image */}
      <Image
        src={apartment.images[0]}
        alt={`${apartment.name} – ${apartment.subtitle}`}
        fill
        className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 50vw"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />

      {/* Meta badges */}
      <div className="absolute top-6 right-6 flex items-center gap-3 text-white/70 text-xs tracking-wider font-medium">
        <span>{apartment.maxGuests} Pers.</span>
      </div>

      {/* Content - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        {/* Decorative line */}
        <div className="w-8 h-px bg-[var(--color-gold)] mb-4 transition-all duration-500 group-hover:w-16" />

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight">
          {apartment.name}
        </h3>
        <p className="text-white/60 text-sm mb-4">
          {apartment.subtitle}
        </p>

        {/* Highlights - shown on hover */}
        <div className="flex flex-wrap gap-2 mb-5 opacity-0 translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
          {apartment.highlights.slice(0, 3).map((highlight) => (
            <span
              key={highlight}
              className="inline-flex items-center px-3 py-1 bg-white/15 backdrop-blur-sm text-white/90 text-xs tracking-wide rounded-full"
            >
              {highlight}
            </span>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-white">
              {formatCurrency(apartment.basePrice)}
            </span>
            <span className="text-white/50 text-sm ml-1">/ Nacht *</span>
          </div>
          <span className="text-[var(--color-gold)] text-xs font-semibold tracking-wider uppercase flex items-center gap-2 translate-x-0 group-hover:translate-x-1 transition-transform duration-300">
            Entdecken
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
