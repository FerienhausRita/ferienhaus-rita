import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "Lernen Sie uns kennen – die Gastgeber des Ferienhauses Rita in Kals am Großglockner.",
};

const values = [
  {
    title: "Persönliche Betreuung",
    text: "Wir sind vor Ort und kümmern uns persönlich um Ihr Wohlbefinden. Ihre Zufriedenheit ist unser Antrieb.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    title: "Qualität & Sauberkeit",
    text: "Hochwertige Ausstattung und penible Sauberkeit sind für uns selbstverständlich – in jeder unserer Wohnungen.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Lokales Wissen",
    text: "Insider-Tipps, Routenvorschläge und Restaurantempfehlungen – wir teilen unser Wissen der Region mit Ihnen.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
];

export default function UeberUnsPage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] flex items-end overflow-hidden">
        <Image
          src="/images/about/gastgeber.jpg"
          alt="Ferienhaus Rita – Ihr Zuhause in den Alpen"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
            Ihre Gastgeber
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 tracking-tight">
            Über uns
          </h1>
        </div>
      </div>

      {/* Story Section */}
      <section className="py-24">
        <Container narrow>
          <div className="max-w-3xl mx-auto">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Unsere Geschichte
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 mb-8 tracking-tight">
              Persönlich. Herzlich. Echt.
            </h2>
            <div className="space-y-5 text-stone-600 text-lg leading-relaxed font-light">
              <p>
                Wir sind Nadja und Manuel Berger und mit Kals am Großglockner seit
                vielen Jahren eng verbunden. Dieses Haus ist für uns ein ganz besonderer
                Ort, den wir mit viel Liebe, Sorgfalt und einem Blick fürs Detail zu
                einem Ferienhaus gemacht haben, in dem man sich vom ersten Moment an
                wohlfühlen kann.
              </p>
              <p>
                Jede unserer vier Wohnungen wurde individuell gestaltet und verbindet
                alpinen Charme mit modernem Komfort. Uns ist wichtig, dass Sie bei uns
                nicht einfach nur übernachten, sondern wirklich ankommen, entspannen und
                die besondere Atmosphäre von Kals genießen können.
              </p>
              <p>
                Da wir die Region seit vielen Jahren kennen und selbst sehr schätzen,
                geben wir unsere persönlichen Empfehlungen gerne an Sie weiter – ob
                Wanderungen, Skitage, Ausflugsziele oder schöne Plätze abseits der
                bekannten Wege. Sprechen Sie uns jederzeit an – wir helfen Ihnen gerne
                dabei, Ihren Aufenthalt so schön wie möglich zu gestalten.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="py-24 bg-stone-50">
        <Container>
          <div className="text-center mb-16">
            <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
              Unsere Philosophie
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
              Was uns ausmacht
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {values.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-stone-100 p-8 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6 text-[var(--color-gold)]">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-stone-900 mb-3 text-lg">
                  {item.title}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24">
        <Container narrow>
          <div className="text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
              Wir freuen uns auf Sie!
            </h2>
            <p className="text-stone-500 text-lg mb-10 font-light">
              Haben Sie Fragen oder möchten Sie direkt buchen?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/buchen"
                className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg"
              >
                Jetzt buchen
              </Link>
              <Link
                href="/kontakt"
                className="border border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
