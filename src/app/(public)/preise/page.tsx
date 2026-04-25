import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPricingData } from "@/lib/pricing-data";
import { formatCurrency } from "@/lib/pricing";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Preise",
  description:
    "Transparente Preise für alle Ferienwohnungen im Ferienhaus Rita in Kals am Großglockner – Sommer- & Winterpreise, Sonderzeiträume, Nebenkosten.",
};

export const dynamic = "force-dynamic";

/** "12-20" → "20.12." */
function formatMmDd(mmdd: string): string {
  const [mm, dd] = mmdd.split("-");
  return `${dd}.${mm}.`;
}

export default async function PreisePage() {
  const { apartments, specialPeriods, taxConfig } = await getAllPricingData();
  const activeSpecialPeriods = specialPeriods.filter((sp) => sp.active);

  // Sort apartments: smaller first
  const sortedApts = [...apartments].sort((a, b) => a.size - b.size);

  return (
    <div>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-stone-50 to-white">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Preise &amp; Konditionen
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mt-4 mb-6 tracking-tight">
              Transparent. Ehrlich. Ohne Überraschungen.
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed font-light">
              Alle Preise auf einen Blick – pro Wohnung, pro Saison und für
              besondere Zeiträume. Keine versteckten Kosten, keine Kleingedrucktes.
            </p>
            <div className="mt-8 flex items-center justify-center gap-1">
              <span className="inline-block w-8 h-px bg-[var(--color-gold)]" />
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)]" />
              <span className="inline-block w-8 h-px bg-[var(--color-gold)]" />
            </div>
          </div>
        </Container>
      </section>

      {/* Saison-Legende */}
      <section className="pb-8">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-4 p-5 bg-amber-50/60 border border-amber-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
                ☀
              </div>
              <div>
                <p className="font-semibold text-stone-900">Sommer</p>
                <p className="text-sm text-stone-600">01. Mai – 30. November</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-blue-50/60 border border-blue-200 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                ❄
              </div>
              <div>
                <p className="font-semibold text-stone-900">Winter</p>
                <p className="text-sm text-stone-600">01. Dezember – 30. April</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Apartment Pricing Cards */}
      <section className="py-12">
        <Container>
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
                Preise pro Wohnung
              </h2>
              <p className="text-stone-500 mt-3">
                Preise verstehen sich pro Nacht, inkl. 10 % MwSt.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedApts.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  {apt.images[0] && (
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={apt.images[0]}
                        alt={apt.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="font-serif text-2xl font-bold text-stone-900">
                        {apt.name}
                      </h3>
                      <p className="text-sm text-stone-500 mt-1">
                        {apt.size} m² · bis {apt.maxGuests} Personen · Grundpreis
                        bis {apt.baseGuests} Pers.
                      </p>
                    </div>

                    {/* Summer/Winter price */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
                        <p className="text-xs uppercase tracking-wider text-amber-700 font-medium mb-1">
                          Sommer
                        </p>
                        <p className="text-2xl font-bold text-stone-900">
                          {formatCurrency(apt.summerPrice)}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          pro Nacht
                        </p>
                        {apt.minNightsSummer > 1 && (
                          <p className="text-[11px] text-stone-400 mt-1">
                            min. {apt.minNightsSummer} Nächte
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                        <p className="text-xs uppercase tracking-wider text-blue-700 font-medium mb-1">
                          Winter
                        </p>
                        <p className="text-2xl font-bold text-stone-900">
                          {formatCurrency(apt.winterPrice)}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          pro Nacht
                        </p>
                        {apt.minNightsWinter > 1 && (
                          <p className="text-[11px] text-stone-400 mt-1">
                            min. {apt.minNightsWinter} Nächte
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fixed fees */}
                    <dl className="space-y-1.5 text-sm border-t border-stone-100 pt-4">
                      <div className="flex justify-between">
                        <dt className="text-stone-500">Endreinigung (einmalig)</dt>
                        <dd className="text-stone-900 font-medium">
                          {formatCurrency(apt.cleaningFee)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-stone-500">
                          Zusatzperson Erw. (ab Person {apt.baseGuests + 1})
                        </dt>
                        <dd className="text-stone-900 font-medium">
                          {formatCurrency(apt.extraAdultPrice ?? apt.extraPersonPrice)}
                          <span className="text-xs text-stone-400"> /Nacht</span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-stone-500">
                          Zusatzperson Kind (bis 12 J.)
                        </dt>
                        <dd className="text-stone-900 font-medium">
                          {formatCurrency(apt.extraChildPrice ?? 20)}
                          <span className="text-xs text-stone-400"> /Nacht</span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-stone-500">1. Hund</dt>
                        <dd className="text-stone-900 font-medium">
                          {formatCurrency(apt.firstDogFee ?? apt.dogFee)}
                          <span className="text-xs text-stone-400"> /Nacht</span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-stone-500">jeder weitere Hund</dt>
                        <dd className="text-stone-900 font-medium">
                          {formatCurrency(apt.additionalDogFee ?? 7.5)}
                          <span className="text-xs text-stone-400"> /Nacht</span>
                        </dd>
                      </div>
                    </dl>

                    {/* CTA */}
                    <div className="mt-5 flex gap-2">
                      <Link
                        href={`/wohnungen/${apt.slug}`}
                        className="flex-1 text-center py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors"
                      >
                        Zur Wohnung
                      </Link>
                      <Link
                        href={`/buchen?apartment=${apt.slug}`}
                        className="flex-1 text-center py-2.5 px-4 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        Jetzt buchen
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Sonderzeiträume */}
      {activeSpecialPeriods.length > 0 && (
        <section className="py-16 bg-stone-50">
          <Container>
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 text-center">
                <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                  Saisonale Aufschläge
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 tracking-tight">
                  Sonderzeiträume
                </h2>
                <p className="text-stone-500 mt-3">
                  In diesen Zeiträumen gilt ein prozentualer Aufschlag auf den
                  jeweiligen Saisonpreis.
                </p>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr className="text-left text-xs text-stone-500 uppercase tracking-wider">
                      <th className="py-3 px-5 font-medium">Zeitraum</th>
                      <th className="py-3 px-5 font-medium">Von – Bis</th>
                      <th className="py-3 px-5 font-medium text-right">
                        Aufschlag
                      </th>
                      <th className="py-3 px-5 font-medium text-right">
                        Mindestnächte
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {activeSpecialPeriods.map((sp, i) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-4 px-5 font-medium text-stone-900">
                          {sp.label}
                        </td>
                        <td className="py-4 px-5 text-stone-600 font-mono text-xs">
                          {formatMmDd(sp.startMmdd)} – {formatMmDd(sp.endMmdd)}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            +{sp.surchargePercent} %
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right text-stone-600">
                          {sp.minNights !== null ? `${sp.minNights} Nächte` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Steuern & Abgaben */}
      <section className="py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
                Rechtliches
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-3 tracking-tight">
                Steuern &amp; Abgaben
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">Kurtaxe</h3>
                  <span className="text-xl font-bold text-[var(--color-gold)]">
                    {formatCurrency(taxConfig.localTaxPerNight)}
                  </span>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Pro Person ab {taxConfig.localTaxExemptAge} Jahren &amp; Nacht.
                  Wird <strong>separat</strong> abgerechnet
                  und ist nicht im Buchungspreis enthalten.
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  Kinder unter {taxConfig.localTaxExemptAge} Jahren sind von der Kurtaxe befreit.
                </p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-stone-900">Mehrwertsteuer</h3>
                  <span className="text-xl font-bold text-[var(--color-gold)]">
                    {Math.round(taxConfig.vatRate * 100)} %
                  </span>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Die MwSt. ist in allen ausgewiesenen Preisen bereits enthalten.
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  Ermäßigter Steuersatz für Beherbergung.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ-Block */}
      <section className="py-16 bg-stone-50">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold text-stone-900 tracking-tight text-center mb-10">
              Häufige Fragen zu den Preisen
            </h2>
            <div className="space-y-4">
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <h3 className="font-semibold text-stone-900 mb-2">
                  Warum gibt es Sommer- und Winterpreise?
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Die Saisonpreise spiegeln Angebot und Nachfrage wider. Im
                  Winter haben wir die Skisaison am Großglockner, im Sommer
                  bieten Bergsteigen, Wandern und Nationalpark alpine Erlebnisse –
                  beides sind Hauptsaisons, aber mit unterschiedlichem Aufwand.
                </p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <h3 className="font-semibold text-stone-900 mb-2">
                  Was passiert, wenn mein Aufenthalt über zwei Saisons geht?
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Kein Problem. Jede Nacht wird einzeln bewertet – so zahlen Sie
                  für jede einzelne Nacht den gerade geltenden Preis. Das gilt
                  auch für Sonderzeiträume.
                </p>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <h3 className="font-semibold text-stone-900 mb-2">
                  Welche Zahlungsmethoden akzeptieren Sie?
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Wir akzeptieren Überweisung (bevorzugt), Bargeld vor Ort sowie
                  gängige Kartenzahlung. Details folgen mit der Buchungsbestätigung.
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/faq"
                className="text-[var(--color-gold)] hover:text-[#b89555] text-sm font-medium underline underline-offset-4"
              >
                Alle FAQs ansehen →
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Band */}
      <section className="py-20 bg-gradient-to-br from-[#c8a96e] to-[#b89555]">
        <Container>
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Bereit für Ihren Alpenurlaub?
            </h2>
            <p className="text-white/90 text-lg leading-relaxed mb-8 font-light">
              Prüfen Sie die Verfügbarkeit und buchen Sie direkt beim Gastgeber –
              ohne Provisionen, mit persönlicher Betreuung.
            </p>
            <Link
              href="/buchen"
              className="inline-flex items-center gap-2 bg-white text-[#8a6a3a] hover:bg-stone-50 px-8 py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
            >
              Verfügbarkeit prüfen
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
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
