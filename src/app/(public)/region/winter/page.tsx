import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AnimateIn from "@/components/ui/AnimateIn";
import ContwiseMaps from "@/components/ui/ContwiseMaps";
import { skipassData } from "@/data/skipass-prices";

export const metadata: Metadata = {
  title: "Winter in Kals am Großglockner",
  description:
    "Skifahren im GG Resort, Rodeln, Langlaufen, Skitouren und gemütliche Hütten – Winter in Kals am Großglockner.",
};


const huetten = [
  {
    name: "Adlerlounge",
    altitude: "2.621 m",
    description:
      "Panoramarestaurant auf der Bergstation mit atemberaubendem 360°-Blick auf über 60 Dreitausender. Gehobene Küche auf höchstem Niveau.",
    image: "/images/region/huette-adlerlounge.jpg",
  },
  {
    name: "Lucknerhaus",
    altitude: "1.920 m",
    description:
      "Traditionelle Jausenstation am Fuße des Großglockners. Idealer Ausgangspunkt für Wanderungen und Skitouren ins Ködnitztal.",
    image: "/images/region/huette-lucknerhaus.jpeg",
  },
  {
    name: "Glocknerblick",
    altitude: "1.650 m",
    description:
      "Gemütliche Almhütte mit hausgemachten Tiroler Spezialitäten. Direkt an der Rodelbahn gelegen – perfekt für eine Einkehr nach der Abfahrt.",
    image: "/images/region/huette-glocknerblick.jpg",
  },
];

const externalLinks = [
  {
    title: "Bergfex Webcams",
    url: "https://www.bergfex.at/kals-grossglockner/webcams/",
    description: "Live-Bilder aus dem Skigebiet und dem Ort",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "GG Resort Kals-Matrei",
    url: "https://www.ggresort.at/",
    description: "Offizielle Website des Skigebiets mit Pistenplan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Loipenbericht Osttirol",
    url: "https://www.osttirol.com/langlaufen",
    description: "Aktuelle Loipenzustände und Schneehöhen",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function WinterPage() {
  return (
    <div>
      {/* Hero – Full Screen */}
      <div className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/region/winter-split.jpg"
          alt="Winter in Kals am Großglockner – verschneite Berglandschaft"
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
            Dezember – April
          </span>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            Winter in Kals
          </h1>
        </div>

        {/* Scroll-down arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white/30 text-[10px] tracking-[0.3em] uppercase">Entdecken</span>
          <svg className="w-5 h-5 text-white/40 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Intro */}
      <section className="py-20">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <p className="text-stone-600 text-lg leading-relaxed font-light max-w-2xl mx-auto">
                Wenn der erste Schnee die Gipfel weiß färbt und die Luft klar und kalt wird,
                verwandelt sich Kals in ein Wintermärchen. Ob auf der Piste, der Loipe oder
                bei einer stillen Schneeschuhwanderung – hier finden Sie Ihren perfekten Wintertag.
              </p>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* GG Resort */}
      <section className="pb-24">
        <Container>
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src="/images/region/ski-resort.jpg"
                  alt="GG Resort Kals-Matrei – Panorama des Skigebiets"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Das Skigebiet
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                  GG Resort Kals-Matrei
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    Das Großglockner Resort Kals-Matrei bietet über 50 Pistenkilometer
                    für alle Könnensstufen. Von breiten Familien-Abfahrten bis zu
                    anspruchsvollen schwarz markierten Pisten ist für jeden etwas dabei.
                  </p>
                  <p>
                    Die modernen Liftanlagen bringen Sie bequem auf bis zu 2.621 Meter –
                    zur legendären Adlerlounge, dem höchstgelegenen Panoramarestaurant
                    Osttirols mit Blick auf über 60 Dreitausender.
                  </p>
                </div>

                {/* Key Facts */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="text-center bg-stone-50 rounded-xl p-4">
                    <div className="font-serif text-2xl font-bold text-gradient-gold">50+</div>
                    <div className="text-xs text-stone-500 mt-1">Pistenkilometer</div>
                  </div>
                  <div className="text-center bg-stone-50 rounded-xl p-4">
                    <div className="font-serif text-2xl font-bold text-gradient-gold">2.621</div>
                    <div className="text-xs text-stone-500 mt-1">Meter Höhe</div>
                  </div>
                  <div className="text-center bg-stone-50 rounded-xl p-4">
                    <div className="font-serif text-2xl font-bold text-gradient-gold">17</div>
                    <div className="text-xs text-stone-500 mt-1">Liftanlagen</div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Skipass-Preise */}
      <section className="py-20 bg-stone-50">
        <Container>
          <AnimateIn>
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Saison {skipassData.season}
                </span>
                <h2 className="font-serif text-3xl font-bold text-stone-900 mt-3 tracking-tight">
                  Skipass-Preise
                </h2>
              </div>
              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {skipassData.prices.map((item, index) => (
                  <div
                    key={`${item.label}-${item.duration}`}
                    className={`flex items-center justify-between px-6 py-4 ${
                      index !== skipassData.prices.length - 1
                        ? "border-b border-stone-100"
                        : ""
                    }`}
                  >
                    <span className="text-stone-700 text-sm">
                      {item.label} {item.duration}
                    </span>
                    <span className="font-semibold text-stone-900">{item.price}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-4 text-center">
                Preise können abweichen. Aktuelle Preise auf{" "}
                <a
                  href="https://www.ggresort.at/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-alpine-600 hover:underline"
                >
                  ggresort.at
                </a>
              </p>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Rodelbahn Lesach */}
      <section className="py-24">
        <Container>
          <AnimateIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Familienspaß
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                  Rodelbahn Lesach
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    Die Naturrodelbahn in Lesach ist ein Highlight für Familien und alle,
                    die es gemütlicher mögen. Durch verschneiten Wald schlängelt sich die
                    Bahn hinab ins Tal – mit herrlichem Bergpanorama als Kulisse.
                  </p>
                  <p>
                    Oben angekommen, wartet die Lesacher Alm mit Tiroler Spezialitäten
                    auf hungrige Rodler. Der perfekte Winternachmittag!
                  </p>
                </div>

                {/* Host-Tipp */}
                <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 mt-8">
                  <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                    Unser Tipp
                  </span>
                  <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                    &ldquo;Gehen Sie am späten Nachmittag rodeln, wenn die Sonne tief steht
                    und das Tal in goldenes Licht taucht. Danach ein heißer Kaiserschmarren
                    auf der Lesacher Alm – so wird der Tag perfekt.&rdquo;
                  </p>
                </div>
              </div>
              <div className="order-1 lg:order-2 relative aspect-[4/3] rounded-2xl overflow-hidden">
                <Image
                  src="/images/region/rodeln.jpg"
                  alt="Rodelbahn in Lesach – Naturrodelbahn mit Bergpanorama"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Langlaufen & Winterwandern – Fullbleed Image Break */}
      <AnimateIn>
        <section className="relative h-[40vh] min-h-[300px] flex items-center overflow-hidden">
          <Image
            src="/images/region/grossglockner-glacier.jpg"
            alt="Winterlandschaft bei Kals am Großglockner"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-lg">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Langlaufen &amp; Winterwandern
              </h2>
              <p className="text-white/80 text-lg leading-relaxed font-light mt-4">
                Bestens gespurte Loipen führen durch die verschneite Winterlandschaft des
                Ködnitztals. Geräumte Winterwanderwege laden zu ausgedehnten Spaziergängen
                ein – mit Blick auf den Großglockner, der in der Wintersonne leuchtet.
              </p>
            </div>
          </div>
        </section>
      </AnimateIn>

      {/* Langlauf-Route Detail */}
      <section className="py-20">
        <Container>
          <AnimateIn>
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl border border-stone-100 p-6">
                <h3 className="font-semibold text-stone-900 mb-2">
                  Promenadenloipe Kals
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">
                  Die schönste Loipe im Tal: 6,4 km entlang des Kalser Bachs durch die
                  verschneite Winterlandschaft. Flach und bestens gespurt – ideal für
                  Einsteiger und genussvolle Langläufer.
                </p>
                <ContwiseMaps resourceId="1788371" height="350px" />
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Skitouren */}
      <section className="py-24">
        <Container>
          <AnimateIn>
            <div className="max-w-3xl mx-auto">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Für Tourengeher
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                Skitouren am Großglockner
              </h2>
              <div className="space-y-4 text-stone-600 leading-relaxed text-lg font-light">
                <p>
                  Kals ist eines der bekanntesten Skitourengebiete der Ostalpen. Das
                  Ködnitztal bietet Routen für Einsteiger und erfahrene Tourengeher
                  gleichermaßen – von gemütlichen Almtouren bis zu anspruchsvollen
                  Hochtouren mit Gletscherkontakt.
                </p>
                <p>
                  Beliebte Ziele sind die Lucknerhütte (2.241 m), die Stüdlhütte (2.802 m)
                  und für ambitionierte Bergsteiger natürlich der Großglockner selbst.
                </p>
              </div>

              {/* Host-Tipp */}
              <div className="border-l-2 border-[var(--color-gold)] pl-6 py-2 mt-8">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Unser Tipp
                </span>
                <p className="font-serif italic text-stone-600 text-base leading-relaxed mt-2">
                  &ldquo;Für Einsteiger empfehlen wir die Tour zum Lucknerhaus – traumhafte
                  Aussicht, moderate Steigung und oben wartet eine gute Jause. Bitte
                  informieren Sie sich vorab über die Lawinenlage!&rdquo;
                </p>
              </div>

              {/* Stüdlhütte Route */}
              <div className="bg-white rounded-2xl border border-stone-100 p-6 mt-8">
                <h3 className="font-semibold text-stone-900 mb-2">
                  Skitour zur Stüdlhütte (2.802 m)
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">
                  Die klassische Tour durchs Ködnitztal zur Stüdlhütte – 9,3 km, 862 Höhenmeter
                  und ständiger Blick auf den Großglockner. Ausgangspunkt für ambitionierte
                  Gipfeltouren.
                </p>
                <ContwiseMaps resourceId="94349190" height="350px" />
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Hütten & Einkehr */}
      <section className="py-24 bg-stone-50">
        <Container>
          <AnimateIn>
            <div className="text-center mb-12">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Einkehren & Genießen
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 tracking-tight">
                Hütten & Restaurants
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {huetten.map((h) => (
                <div
                  key={h.name}
                  className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative h-48">
                    <Image
                      src={h.image}
                      alt={`${h.name} – ${h.altitude}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="font-semibold text-stone-900 text-lg">
                        {h.name}
                      </h3>
                      <span className="text-xs text-[var(--color-gold)] font-medium">
                        {h.altitude}
                      </span>
                    </div>
                    <p className="text-stone-500 text-sm leading-relaxed">
                      {h.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/region/restaurants"
                className="inline-flex items-center gap-2 text-alpine-600 hover:text-alpine-700 text-sm font-semibold transition-colors"
              >
                Alle Restaurants & Hütten ansehen
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </AnimateIn>
        </Container>
      </section>

      {/* Webcams & Links */}
      <section className="py-20">
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
                  className="flex flex-col items-center text-center bg-stone-50 hover:bg-white rounded-2xl border border-stone-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
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
      <section className="py-24 bg-stone-50">
        <Container narrow>
          <AnimateIn>
            <div className="text-center">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                Winterurlaub in Kals buchen
              </h2>
              <p className="text-stone-500 text-lg mb-10 font-light">
                Genießen Sie die verschneite Bergwelt direkt vor der Haustür.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/buchen"
                  className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
                >
                  Verfügbarkeit prüfen
                </Link>
                <Link
                  href="/region/sommer"
                  className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all"
                >
                  Sommer ansehen
                </Link>
              </div>
            </div>
          </AnimateIn>
        </Container>
      </section>
    </div>
  );
}
