import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AnimateIn from "@/components/ui/AnimateIn";

export const metadata: Metadata = {
  title: "Region & Aktivitäten",
  description:
    "Kals am Großglockner – Ihr Urlaubsparadies in den Hohen Tauern. Skifahren, Wandern, Natur und mehr.",
};

export default function RegionPage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden">
        <Image
          src="/images/hero/aerial.jpg"
          alt="Kals am Großglockner – Luftaufnahme des Bergdorfs"
          fill
          className="object-cover ken-burns"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
            Osttirol · Nationalpark Hohe Tauern
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 tracking-tight">
            Kals am Großglockner
          </h1>
          <p className="mt-4 text-white/70 text-lg max-w-lg font-light">
            Ein Ort, der uns nie loslässt – und Sie auch nicht.
          </p>
        </div>
      </div>

      {/* Das Bergdorf – Overlap Layout */}
      <section className="py-24">
        <Container>
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              {/* Bild */}
              <div className="lg:col-span-7 relative aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src="/images/region/kals-village.jpg"
                  alt="Kals am Großglockner – Blick auf das Bergdorf mit Pfarrkirche"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
              </div>

              {/* Text-Card – überlappt das Bild auf Desktop */}
              <div className="lg:col-span-6 lg:-ml-16 relative z-10 mt-8 lg:mt-0">
                <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg border border-stone-100">
                  <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                    Das Bergdorf
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                    Wo die Uhren langsamer gehen
                  </h2>
                  <div className="space-y-4 text-stone-600 leading-relaxed">
                    <p>
                      Kals am Großglockner hat sich seinen ursprünglichen Charme bewahrt.
                      Das Bergdorf auf 1.325 Metern liegt eingebettet in eine atemberaubende
                      Hochgebirgslandschaft im Herzen des Nationalparks Hohe Tauern.
                    </p>
                    <p>
                      Unser Ferienhaus liegt im ruhigen Ortsteil Großdorf – umgeben von
                      saftigen Wiesen und mit freiem Blick auf die umliegenden Gipfel. Hier
                      hört man morgens die Kirchenglocken und abends die Stille der Berge.
                    </p>
                  </div>

                  {/* Host-Tipp */}
                  <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 mt-8">
                    <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                      Unser Tipp
                    </span>
                    <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                      &ldquo;Ein Spaziergang durch Großdorf am frühen Morgen, wenn der Tau
                      noch auf den Wiesen liegt und die ersten Sonnenstrahlen die Gipfel
                      berühren – so beginnt für uns der perfekte Urlaubstag.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Großglockner – Fullbleed Cinematic */}
      <AnimateIn>
        <section className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
          <Image
            src="/images/region/grossglockner.jpg"
            alt="Großglockner – Österreichs höchster Berg"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
            <div className="max-w-2xl">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                3.798 Meter
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-3 mb-4 tracking-tight">
                Der Großglockner
              </h2>
              <p className="text-white/80 text-lg leading-relaxed font-light">
                Österreichs höchster Berg ist von unserem Haus aus zum Greifen nah.
                Im Herzen des{" "}
                <span className="text-gradient-gold font-serif font-bold">
                  1.800&nbsp;km²
                </span>{" "}
                großen Nationalparks Hohe Tauern gelegen, bietet Kals über{" "}
                <span className="text-gradient-gold font-serif font-bold">
                  300&nbsp;km
                </span>{" "}
                markierte Wanderwege und eine Bergwelt, die ihresgleichen sucht.
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>

      {/* Split-Screen Winter / Sommer */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {/* Winter */}
        <Link
          href="/region/winter"
          className="relative h-[50vh] md:h-[70vh] min-h-[400px] md:min-h-[500px] flex items-center justify-center overflow-hidden group"
        >
          <Image
            src="/images/region/winter-split.jpg"
            alt="Winter in Kals – Skifahren und Schneelandschaft"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 transition-all duration-500" />
          <div className="relative z-10 text-center px-8">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Dezember – April
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mt-3 tracking-tight">
              Winter
            </h2>
            <p className="text-white/70 mt-3 text-lg font-light max-w-sm mx-auto">
              Skifahren, Rodeln, Langlaufen und die Stille verschneiter Berge.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-medium tracking-wider uppercase group-hover:bg-white/20 transition-all">
              Winter entdecken
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Sommer */}
        <Link
          href="/region/sommer"
          className="relative h-[50vh] md:h-[70vh] min-h-[400px] md:min-h-[500px] flex items-center justify-center overflow-hidden group"
        >
          <Image
            src="/images/region/summer-split.jpg"
            alt="Sommer in Kals – Wandern und grüne Almlandschaften"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 transition-all duration-500" />
          <div className="relative z-10 text-center px-8">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Mai – Oktober
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mt-3 tracking-tight">
              Sommer
            </h2>
            <p className="text-white/70 mt-3 text-lg font-light max-w-sm mx-auto">
              Wandern, Klettern, Biken und die majestätische Bergwelt erleben.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-medium tracking-wider uppercase group-hover:bg-white/20 transition-all">
              Sommer entdecken
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </section>

      {/* CTA */}
      <section className="py-24 bg-stone-50">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Erleben Sie Kals selbst
              </h2>
              <p className="text-stone-500 text-lg mb-10 font-light max-w-lg mx-auto">
                Wir freuen uns darauf, Ihnen unsere Lieblingsorte zu zeigen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buchen"
                  className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
                >
                  Verfügbarkeit prüfen
                </Link>
                <Link
                  href="/kontakt"
                  className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all"
                >
                  Kontakt aufnehmen
                </Link>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>
    </div>
  );
}
