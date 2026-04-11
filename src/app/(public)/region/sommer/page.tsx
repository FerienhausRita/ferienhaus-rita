import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AnimateIn from "@/components/ui/AnimateIn";
import ContwiseMaps from "@/components/ui/ContwiseMaps";
import ScrollDownIndicator from "@/components/ui/ScrollDownIndicator";

export const metadata: Metadata = {
  title: "Sommer in Kals am Großglockner",
  description:
    "Wandern, Mountainbiken, Klettern und Trailrunning – Sommer in Kals am Großglockner im Nationalpark Hohe Tauern.",
  openGraph: {
    images: [{ url: "/images/region/summer-split.jpg", width: 1200, height: 630, alt: "Sommer in Kals am Großglockner" }],
  },
};

type Difficulty = "leicht" | "mittel" | "schwer";

const wanderRouten: {
  name: string;
  from: string;
  to: string;
  difficulty: Difficulty;
  duration: string;
  elevation: string;
  description: string;
  resourceId?: string;
}[] = [
  {
    name: "Ködnitztal zur Lucknerhütte",
    from: "Lucknerhaus (1.920 m)",
    to: "Lucknerhütte (2.241 m)",
    difficulty: "leicht",
    duration: "1,5 – 2 Std.",
    elevation: "↑ 321 Hm",
    description:
      "Gemütliche Wanderung durch das beeindruckende Ködnitztal mit Blick auf den Großglockner. Ideal für Familien und als Einstiegstour.",
    resourceId: "87418815",
  },
  {
    name: "Dorfertal zum Dorfer See",
    from: "Parkplatz Dorfertal",
    to: "Dorfer See (1.935 m)",
    difficulty: "mittel",
    duration: "3 – 3,5 Std.",
    elevation: "↑ 600 Hm",
    description:
      "Abwechslungsreiche Tour durch eines der schönsten Täler Osttirols. Der türkisblaue Bergsee am Ende belohnt jeden Schritt.",
    resourceId: "94229740",
  },
  {
    name: "Sudetendeutsche Hütte",
    from: "Lucknerhaus (1.920 m)",
    to: "Sudetendeutsche Hütte (2.656 m)",
    difficulty: "schwer",
    duration: "4,5 – 5 Std.",
    elevation: "↑ 736 Hm",
    description:
      "Anspruchsvolle alpine Tour mit grandiosem Panorama. Trittsicherheit und Bergerfahrung erforderlich. Übernachtung auf der Hütte möglich.",
  },
  {
    name: "Glorer Hütte über Berger Törl",
    from: "Lucknerhaus (1.920 m)",
    to: "Glorer Hütte (2.642 m)",
    difficulty: "mittel",
    duration: "3,5 – 4 Std.",
    elevation: "↑ 722 Hm",
    description:
      "Beliebte Hüttenwanderung mit dem berühmten Blick auf Großglockner und Pasterze. Der Weg über das Berger Törl belohnt mit einem atemberaubenden Panorama.",
    resourceId: "94721506",
  },
];

const mtbRouten = [
  {
    name: "Talrunde Kalserbach Nr. 118",
    description:
      "Gemütliche Familientour entlang des Kalser Bachs. Flach und gut befahrbar – ideal als Einstiegstour oder nachmittägliche Ausfahrt.",
    difficulty: "leicht" as Difficulty,
    resourceId: "81519707",
  },
  {
    name: "Lesachalmweg Nr. 112",
    description:
      "Anspruchsvolle MTB-Tour von der Lana-Brücke durch den Wald zur Lesachalm und zum Alpengasthof Glödis Refugium mit Blick auf die Glödis (3.207 m).",
    difficulty: "mittel" as Difficulty,
    resourceId: "81531421",
  },
];

const difficultyColors: Record<Difficulty, { bg: string; text: string }> = {
  leicht: { bg: "bg-emerald-50", text: "text-emerald-700" },
  mittel: { bg: "bg-amber-50", text: "text-amber-700" },
  schwer: { bg: "bg-red-50", text: "text-red-700" },
};

const externalLinks = [
  {
    title: "Bergfex Webcams",
    url: "https://www.bergfex.at/kals-grossglockner/webcams/",
    description: "Live-Bilder aus der Region",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Nationalpark Hohe Tauern",
    url: "https://hohetauern.at/",
    description: "Offizielle Website des Nationalparks",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Großglockner Hochalpenstraße",
    url: "https://www.grossglockner.at/",
    description: "Mautpreise, Öffnungszeiten, Infos",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function SommerPage() {
  return (
    <div>
      {/* Hero – Full Screen */}
      <div data-hero className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/region/summer-split.jpg"
          alt="Sommer in Kals – grüne Almwiesen und Bergpanorama"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/region"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Region
          </Link>
          <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase block mb-4">
            Mai – Oktober
          </span>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            Sommer in Kals
          </h1>
        </div>

        {/* Scroll-down arrow */}
        <ScrollDownIndicator />
      </div>

      {/* Intro */}
      <section className="py-20">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <p className="text-stone-600 text-lg leading-relaxed font-light max-w-2xl mx-auto">
                Wenn der Schnee schmilzt und die Almwiesen in voller Blüte stehen, offenbart
                Kals seine ganze Schönheit. Über 300 Kilometer markierte Wanderwege, kristallklare
                Bergseen und die majestätische Kulisse des Großglockners machen jeden Tag zum
                Abenteuer.
              </p>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Wandern – Hauptsektion */}
      <section className="pb-24">
        <Container>
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden lg:sticky lg:top-24">
                <Image
                  src="/images/region/dorfertal.jpg"
                  alt="Dorfertal bei Kals – grünes Tal mit Gebirgsbach"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Nationalpark Hohe Tauern
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-4 tracking-tight">
                  Wandern in Kals
                </h2>
                <p className="text-stone-600 leading-relaxed mb-8">
                  Von gemütlichen Talwanderungen bis zu anspruchsvollen Gipfeltouren –
                  die Region rund um Kals bietet für jedes Fitnesslevel den perfekten Weg.
                  Hier sind unsere liebsten Routen:
                </p>

                {/* Wanderrouten */}
                <div className="space-y-6">
                  {wanderRouten.map((route) => {
                    const colors = difficultyColors[route.difficulty];
                    return (
                      <div
                        key={route.name}
                        className="bg-white rounded-2xl border border-stone-100 p-6 hover:shadow-lg transition-shadow duration-300"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="font-semibold text-stone-900">
                            {route.name}
                          </h3>
                          <span
                            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}
                          >
                            {route.difficulty}
                          </span>
                        </div>
                        <p className="text-stone-500 text-sm leading-relaxed mb-3">
                          {route.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-stone-400">
                          <span>{route.duration}</span>
                          <span>{route.elevation}</span>
                          <span>
                            {route.from} → {route.to}
                          </span>
                        </div>
                        {route.resourceId && (
                          <ContwiseMaps
                            resourceId={route.resourceId}
                            height="300px"
                            className="mt-4"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Host-Tipp */}
                <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 mt-8">
                  <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                    Unser Tipp
                  </span>
                  <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                    &ldquo;Die Wanderung ins Dorfertal zum Dorfer See ist für uns die
                    schönste Tour der Region. Starten Sie früh morgens – dann haben Sie
                    den türkisblauen See fast für sich allein.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Großglockner Hochalpenstraße – Fullbleed */}
      <AnimateIn>
        <section className="relative h-[40vh] min-h-[300px] flex items-center overflow-hidden">
          <Image
            src="/images/region/grossglockner-glacier.jpg"
            alt="Großglockner mit Pasterze-Gletscher"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-lg">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Kalser Glocknerstraße
              </h2>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed font-light mt-4">
                Die Kalser Glocknerstraße führt von Kals zum Lucknerhaus auf 1.920&nbsp;m – Ausgangspunkt für Wanderungen ins Ködnitztal, zur Lucknerhütte und zur Besteigung des Großglockners. Die Großglockner Hochalpenstraße liegt auf der anderen Seite und ist über Heiligenblut erreichbar (ca.&nbsp;85&nbsp;km).
              </p>
              <a
                href="https://www.grossglockner.at/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mt-4 transition-colors"
              >
                Großglockner Hochalpenstraße – Infos & Maut
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </AnimateIn>

      {/* Mountainbiken & Klettern – Abwechselndes Layout */}
      <section className="py-24">
        <Container>
          {/* Mountainbiken */}
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src="/images/region/mtb.jpg"
                  alt="Mountainbiken in den Hohen Tauern"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Auf zwei Rädern
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                  Mountainbiken
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    Die Region rund um Kals bietet abwechslungsreiche Touren für
                    Mountainbiker aller Levels. Von gemütlichen Almwegen bis zu
                    anspruchsvollen Singletrails durch alpines Gelände – hier finden
                    Sie Ihren Flow.
                  </p>
                  <p>
                    Besonders empfehlenswert ist die Tour durch das Dorfertal oder
                    die Runde über die Kalser Höhe mit Panoramablick auf die
                    Schobergruppe und die Glocknergruppe.
                  </p>
                </div>

                {/* MTB Routen mit Karten */}
                <div className="space-y-4 mt-8">
                  {mtbRouten.map((route) => {
                    const colors = difficultyColors[route.difficulty];
                    return (
                      <div
                        key={route.name}
                        className="bg-white rounded-2xl border border-stone-100 p-6"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-stone-900 text-sm">
                            {route.name}
                          </h3>
                          <span
                            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}
                          >
                            {route.difficulty}
                          </span>
                        </div>
                        <p className="text-stone-500 text-sm leading-relaxed mb-4">
                          {route.description}
                        </p>
                        <ContwiseMaps
                          resourceId={route.resourceId}
                          height="300px"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </AnimateIn>

          {/* Klettern */}
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
              <div className="order-2 lg:order-1">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Vertikal unterwegs
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                  Klettern & Klettersteige
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    Vom Einsteiger-Klettersteig bis zur alpinen Mehrseillänge – die
                    Felsformationen rund um Kals bieten für jeden Kletterer die
                    passende Herausforderung.
                  </p>
                  <p>
                    Der Klettersteig an der Gruberscharte und die Routen im
                    Ködnitztal sind beliebte Ziele. Für Familien gibt es auch
                    einen überschaubaren Übungsklettersteig.
                  </p>
                </div>

                {/* Host-Tipp */}
                <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 mt-8">
                  <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                    Unser Tipp
                  </span>
                  <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                    &ldquo;Wenn Sie noch nie auf einem Klettersteig waren – buchen Sie
                    einen der Nationalpark-Ranger als Guide. Die kennen jeden Griff
                    und erzählen nebenbei noch Geschichten über die Berge.&rdquo;
                  </p>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src="/images/region/klettern.jpg"
                  alt="Klettersteig in den Hohen Tauern bei Kals"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </AnimateIn>

          {/* Laufen & Trailrunning + Baden */}
          <AnimateIn>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-50 rounded-2xl p-8 lg:p-10">
                <div className="w-8 h-px bg-[var(--color-gold)] mb-6" />
                <h3 className="font-serif text-2xl font-bold text-stone-900 mb-4">
                  Laufen & Trailrunning
                </h3>
                <div className="space-y-3 text-stone-600 text-sm leading-relaxed">
                  <p>
                    Das Kalser Tal bietet ideale Bedingungen für Läufer. Flache
                    Talwege entlang des Kalser Bachs für entspannte Runden und
                    anspruchsvolle Trails bergauf für Trailrunner.
                  </p>
                  <p>
                    Die Höhenlage von 1.325 Metern macht das Training zum
                    natürlichen Höhentraining – viele Leichtathleten kommen
                    deshalb hierher.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/30 rounded-2xl p-8 lg:p-10">
                <div className="w-8 h-px bg-[var(--color-gold)] mb-6" />
                <h3 className="font-serif text-2xl font-bold text-stone-900 mb-4">
                  Bergseen & Abkühlung
                </h3>
                <div className="space-y-3 text-stone-600 text-sm leading-relaxed">
                  <p>
                    Kristallklare Gebirgsbäche und Bergseen laden zur erfrischenden
                    Abkühlung ein – wobei &ldquo;erfrischend&rdquo; hier wörtlich
                    gemeint ist: Die Wassertemperaturen liegen selten über 15°C!
                  </p>
                  <p>
                    Der Dorfer See und der Kalser Bach bieten die schönsten
                    Badestellen. Für Hartgesottene und Naturliebhaber ein
                    unvergessliches Erlebnis.
                  </p>
                </div>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Einkehr & Restaurants */}
      <section className="py-20">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Genuss & Einkehr
              </span>
              <h2 className="font-serif text-3xl font-bold text-stone-900 mt-3 mb-4 tracking-tight">
                Restaurants & Hütten
              </h2>
              <p className="text-stone-500 leading-relaxed mb-8 max-w-lg mx-auto">
                Nach einem langen Tag in den Bergen wartet die Kalser Küche mit
                regionalen Spezialitäten und Tiroler Gastfreundschaft.
              </p>
              <Link
                href="/region/restaurants"
                className="inline-flex items-center gap-2 bg-alpine-600 hover:bg-alpine-700 text-white px-6 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
              >
                Alle Restaurants ansehen
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Webcams & Links */}
      <section className="py-20 bg-stone-50">
        <Container>
          <AnimateIn>
            <div className="text-center mb-10">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Immer aktuell
              </span>
              <h2 className="font-serif text-3xl font-bold text-stone-900 mt-3 tracking-tight">
                Webcams & nützliche Links
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {externalLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center text-center bg-white hover:bg-white rounded-2xl border border-stone-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-full bg-alpine-50 flex items-center justify-center text-alpine-600 mb-4 group-hover:bg-alpine-100 transition-colors">
                    {link.icon}
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1">
                    {link.title}
                  </h3>
                  <p className="text-stone-400 text-xs">{link.description}</p>
                  <svg className="w-4 h-4 text-stone-300 mt-3 group-hover:text-alpine-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
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
                Sommerurlaub in Kals buchen
              </h2>
              <p className="text-stone-500 text-lg mb-10 font-light">
                Wanderschuhe einpacken und die Bergwelt entdecken.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buchen"
                  className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
                >
                  Verfügbarkeit prüfen
                </Link>
                <Link
                  href="/region/winter"
                  className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all"
                >
                  Winter ansehen
                </Link>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>
    </div>
  );
}
