import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AnimateIn from "@/components/ui/AnimateIn";
import { restaurants } from "@/data/restaurants";

export const metadata: Metadata = {
  title: "Restaurants & Hütten in Kals am Großglockner",
  description:
    "Von der Almhütte bis zum Panoramarestaurant – die besten Einkehrmöglichkeiten in Kals am Großglockner.",
};

export default function RestaurantsPage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[350px] flex items-end overflow-hidden">
        <Image
          src="/images/region/kals-village.jpg"
          alt="Kals am Großglockner – Dorf mit Bergpanorama"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <Link
            href="/region"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Region
          </Link>
          <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase block">
            Genuss & Einkehr
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 tracking-tight">
            Restaurants & Hütten
          </h1>
        </div>
      </div>

      {/* Intro */}
      <section className="py-20">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <p className="text-stone-600 text-lg leading-relaxed font-light max-w-2xl mx-auto">
                Nach einem Tag in den Bergen wartet die Kalser Gastfreundschaft:
                Von der urigen Almhütte mit Kaiserschmarren bis zum
                Panoramarestaurant auf 2.621 Metern – hier wird jede Einkehr zum
                Erlebnis.
              </p>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Restaurant Grid */}
      <section className="pb-24">
        <Container>
          <AnimateIn>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.slug}
                  className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-48">
                    {restaurant.image.includes("placeholder") ? (
                      <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50 flex items-center justify-center">
                        <div className="text-center">
                          <svg
                            className="w-10 h-10 text-stone-300 mx-auto"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.126-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
                            />
                          </svg>
                          <p className="text-stone-400 text-xs mt-2 font-medium">
                            {restaurant.name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={restaurant.image}
                        alt={restaurant.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-stone-900 text-lg">
                        {restaurant.name}
                      </h3>
                      {restaurant.altitude && (
                        <span className="text-xs text-[var(--color-gold)] font-medium shrink-0">
                          {restaurant.altitude}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                        {restaurant.cuisine}
                      </span>
                      <span className="text-xs text-stone-400">
                        {restaurant.location}
                      </span>
                    </div>

                    <p className="text-stone-500 text-sm leading-relaxed flex-1">
                      {restaurant.description}
                    </p>

                    {/* Features */}
                    {restaurant.features && restaurant.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {restaurant.features.map((f) => (
                          <span
                            key={f}
                            className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* External Link */}
                    {restaurant.website && (
                      <a
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-alpine-600 hover:text-alpine-700 text-sm font-medium mt-4 transition-colors"
                      >
                        Website besuchen
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Host-Tipp */}
      <section className="py-20 bg-stone-50">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 text-left max-w-xl mx-auto">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Unser Tipp
                </span>
                <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                  &ldquo;Reservieren Sie im Sommer unbedingt einen Tisch auf der
                  Adlerlounge – der Sonnenuntergang auf 2.621 Metern mit Blick
                  auf die Bergwelt ist unvergesslich. Am besten mit der letzten
                  Gondel nach oben fahren.&rdquo;
                </p>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Urlaub in Kals buchen
              </h2>
              <p className="text-stone-500 text-lg mb-10 font-light">
                Genießen Sie die Kalser Küche direkt vor der Haustür.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buchen"
                  className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
                >
                  Verfügbarkeit prüfen
                </Link>
                <Link
                  href="/region"
                  className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all"
                >
                  Zurück zur Region
                </Link>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>
    </div>
  );
}
