import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Region & Aktivitäten",
  description:
    "Kals am Großglockner – Ihr Urlaubsparadies in den Hohen Tauern. Skifahren, Wandern, Natur und mehr.",
};

const winterActivities = [
  {
    title: "GG Resort Kals-Matrei",
    description:
      "Das Skigebiet mit über 50 km Pisten bietet Abfahrten für alle Könnensstufen. Moderne Liftanlagen und traumhafte Panoramen inklusive.",
  },
  {
    title: "Langlaufen",
    description:
      "Bestens gespurte Loipen führen durch verschneite Winterlandschaften im Tal und auf den Höhen.",
  },
  {
    title: "Winterwandern & Schneeschuhwandern",
    description:
      "Geräumte Winterwanderwege und geführte Schneeschuhtouren durch die stille Bergwelt.",
  },
  {
    title: "Rodeln",
    description:
      "Natürliche Rodelbahnen mit herrlichem Bergblick – Spaß für die ganze Familie.",
  },
  {
    title: "Skitouren",
    description:
      "Kals ist ein Eldorado für Skitourengeher. Zahlreiche Routen für Einsteiger und Profis.",
  },
];

const summerActivities = [
  {
    title: "Wandern im Nationalpark Hohe Tauern",
    description:
      "Über 300 km markierte Wanderwege – von leichten Spaziergängen bis zu anspruchsvollen Gipfeltouren.",
  },
  {
    title: "Großglockner & Hochalpenstraße",
    description:
      "Österreichs höchster Berg zum Greifen nah. Die berühmte Hochalpenstraße ist ein Muss.",
  },
  {
    title: "Klettern & Klettersteige",
    description:
      "Vom Einsteiger-Klettersteig bis zur alpinen Herausforderung – für jeden das Richtige.",
  },
  {
    title: "Mountainbiken",
    description:
      "Abwechslungsreiche Trails und Touren durch Almlandschaften und Bergwälder.",
  },
  {
    title: "Baden & Natur",
    description:
      "Kristallklare Bergseen und erfrischende Bäche laden zur Abkühlung ein.",
  },
];

const highlights = [
  {
    number: "3.798",
    label: "Meter",
    text: "Der Großglockner – Österreichs höchster Berg in unmittelbarer Nähe.",
  },
  {
    number: "1.800",
    label: "km²",
    text: "Nationalpark Hohe Tauern – Europas größter Nationalpark vor der Haustür.",
  },
  {
    number: "300+",
    label: "km Wanderwege",
    text: "Markierte Wege von leicht bis alpin für jeden Anspruch.",
  },
  {
    number: "50+",
    label: "km Pisten",
    text: "GG Resort Kals-Matrei mit modernen Liftanlagen.",
  },
];

export default function RegionPage() {
  return (
    <div>
      {/* Cinematic Hero */}
      <div className="relative h-[70vh] min-h-[500px] flex items-end overflow-hidden">
        <Image
          src="/images/hero/aerial.jpg"
          alt="Ferienhaus Rita in Kals am Großglockner – Luftaufnahme"
          fill
          className="object-cover"
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
            Ein Naturparadies für jede Jahreszeit – am Fuße des höchsten Berges
            Österreichs.
          </p>
        </div>
      </div>

      {/* Highlights Numbers */}
      <section className="py-20 bg-stone-50">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            {highlights.map((h) => (
              <div key={h.label} className="text-center">
                <div className="font-serif text-4xl sm:text-5xl font-bold text-gradient-gold mb-1">
                  {h.number}
                </div>
                <div className="text-stone-700 text-xs font-medium tracking-wide uppercase mb-2">
                  {h.label}
                </div>
                <p className="text-stone-400 text-sm">{h.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Village Section */}
      <section className="py-24">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="/images/region/kals-village.jpg"
                alt="Kals am Großglockner – Dorfansicht mit Pfarrkirche"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Das Bergdorf
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-6 tracking-tight">
                Authentisch & Ursprünglich
              </h2>
              <div className="space-y-4 text-stone-600 leading-relaxed">
                <p>
                  Kals am Großglockner hat sich seinen ursprünglichen Charme bewahrt.
                  Das Bergdorf auf 1.325 Metern liegt eingebettet in eine atemberaubende
                  Hochgebirgslandschaft im Herzen des Nationalparks Hohe Tauern.
                </p>
                <p>
                  Hier finden Sie keine Massentourismus-Kulisse, sondern ehrliche
                  Gastfreundschaft, regionale Kulinarik und eine Natur, die zum
                  Durchatmen einlädt. Ob gemütlicher Alm-Spaziergang oder
                  anspruchsvolle Gipfeltour – Kals bietet für jeden etwas.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Winter */}
      <section className="py-24 bg-stone-50">
        <Container>
          <div className="text-center mb-16">
            <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
              Dezember – April
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
              Winteraktivitäten
            </h2>
            <p className="mt-4 text-stone-500 text-lg max-w-2xl mx-auto">
              Kals verwandelt sich im Winter in ein Schneeparadies – perfekt für
              Skifahrer, Langläufer und Naturliebhaber.
            </p>
          </div>

          <div className="relative h-64 sm:h-96 rounded-2xl overflow-hidden mb-12">
            <Image
              src="/images/region/grossglockner.jpg"
              alt="Großglockner im Winter – Blick vom Ködnitztal"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {winterActivities.map((activity) => (
              <div
                key={activity.title}
                className="bg-white rounded-2xl border border-stone-100 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-8 h-px bg-[var(--color-gold)] mb-6" />
                <h3 className="font-semibold text-stone-900 mb-3">
                  {activity.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Summer */}
      <section className="py-24">
        <Container>
          <div className="text-center mb-16">
            <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
              Mai – Oktober
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
              Sommeraktivitäten
            </h2>
            <p className="mt-4 text-stone-500 text-lg max-w-2xl mx-auto">
              Im Sommer locken unzählige Wander- und Radwege, kristallklare Seen
              und die majestätische Bergwelt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden">
              <Image
                src="/images/region/dorfertal.jpg"
                alt="Dorfertal bei Kals – grünes Tal mit Gebirgsbach"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden">
              <Image
                src="/images/region/grossglockner-glacier.jpg"
                alt="Großglockner mit Pasterze-Gletscher"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summerActivities.map((activity) => (
              <div
                key={activity.title}
                className="bg-white rounded-2xl border border-stone-100 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-8 h-px bg-[var(--color-gold)] mb-6" />
                <h3 className="font-semibold text-stone-900 mb-3">
                  {activity.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 bg-stone-50">
        <Container narrow>
          <div className="text-center bg-gradient-to-br from-white to-amber-50/30 rounded-3xl p-12 sm:p-16 border border-stone-100 shadow-sm">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
              Entdecken Sie Kals am Großglockner
            </h2>
            <p className="text-stone-500 text-lg mb-10 max-w-lg mx-auto font-light">
              Buchen Sie jetzt Ihre Unterkunft und erleben Sie die Schönheit der
              Osttiroler Bergwelt.
            </p>
            <Link
              href="/buchen"
              className="inline-flex bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
            >
              Verfügbarkeit prüfen
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
