import { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FAQJsonLd from "@/components/seo/FAQJsonLd";

export const metadata: Metadata = {
  title: "Häufige Fragen",
  description:
    "Antworten auf häufig gestellte Fragen rund um Ihren Aufenthalt im Ferienhaus Rita.",
};

const faqGroups = [
  {
    category: "Buchung & Anreise",
    items: [
      {
        question: "Wie kann ich buchen?",
        answer:
          "Sie können direkt über unsere Website eine Buchungsanfrage stellen. Wählen Sie Ihren Reisezeitraum, die passende Wohnung und füllen Sie das Buchungsformular aus. Wir bestätigen Ihre Anfrage innerhalb von 24 Stunden per E-Mail.",
      },
      {
        question: "Wann kann ich anreisen und abreisen?",
        answer:
          "Die Anreise ist ab 15:00 Uhr möglich, die Abreise bitten wir bis 10:00 Uhr. Abweichende Zeiten können in manchen Fällen nach Absprache arrangiert werden.",
      },
      {
        question: "Gibt es einen Mindestaufenthalt?",
        answer:
          "In der Hauptsaison (Winter und Sommer) beträgt der Mindestaufenthalt in der Regel 3 bis 7 Nächte. In der Nebensaison sind auch kürzere Aufenthalte möglich. Bitte kontaktieren Sie uns für Details.",
      },
      {
        question: "Welche Zahlungsmethoden werden akzeptiert?",
        answer:
          "Wir akzeptieren Zahlung per Banküberweisung. Die Zahlungsdetails erhalten Sie mit der Buchungsbestätigung. Eine Anzahlung von 30% ist bei Buchung fällig, der Restbetrag 14 Tage vor Anreise.",
      },
      {
        question: "Wie sind die Stornobedingungen?",
        answer:
          "Bis 30 Tage vor Anreise ist eine kostenlose Stornierung möglich. Bei Stornierung zwischen 30 und 14 Tagen vor Anreise berechnen wir 50% des Gesamtpreises. Bei späterer Stornierung wird der volle Betrag fällig. Wir empfehlen eine Reiserücktrittsversicherung.",
      },
    ],
  },
  {
    category: "Wohnungen & Ausstattung",
    items: [
      {
        question: "Ist Bettwäsche und Handtücher inklusive?",
        answer:
          "Ja, Bettwäsche und Handtücher sind in allen Wohnungen inklusive und werden frisch bezogen bereitgestellt.",
      },
      {
        question: "Gibt es WLAN?",
        answer:
          "Ja, in allen Wohnungen steht Ihnen kostenfreies WLAN zur Verfügung.",
      },
      {
        question: "Ist die Endreinigung inklusive?",
        answer:
          "Die Endreinigung wird separat berechnet: 100 € für die großen Wohnungen (96 m²) und 50 € für die kleineren Wohnungen. Der Betrag wird automatisch in der Preisberechnung berücksichtigt.",
      },
      {
        question: "Gibt es einen Parkplatz?",
        answer:
          "Ja, es stehen kostenfreie Parkplätze direkt am Haus zur Verfügung.",
      },
      {
        question: "Gibt es einen Skiraum?",
        answer:
          "Ja, ein beheizter Skiraum mit Trocknungsmöglichkeit für Skischuhe steht allen Gästen zur Verfügung.",
      },
    ],
  },
  {
    category: "Hunde & Haustiere",
    items: [
      {
        question: "Sind Hunde erlaubt?",
        answer:
          "Ja, Hunde sind bei uns herzlich willkommen! Der Aufpreis beträgt 15 € pro Hund und Nacht. Bitte geben Sie bei der Buchung an, dass Sie einen Hund mitbringen.",
      },
      {
        question: "Was muss ich bei der Anreise mit Hund beachten?",
        answer:
          "Bitte bringen Sie ein eigenes Hundebett und Fressnapf mit. Hunde sind in den Wohnungen erlaubt, sollten aber nicht auf Betten oder Sofas liegen. Im Ort und auf Wanderwegen herrscht zum Teil Leinenpflicht.",
      },
    ],
  },
  {
    category: "Region & Aktivitäten",
    items: [
      {
        question: "Wie weit ist das Skigebiet entfernt?",
        answer:
          "Das GG Resort Kals-Matrei ist nur wenige Fahrminuten entfernt. Mit dem Skibus, der direkt am Haus hält, erreichen Sie die Talstation bequem und kostenlos.",
      },
      {
        question: "Gibt es Einkaufsmöglichkeiten in der Nähe?",
        answer:
          "In Kals gibt es einen kleinen Supermarkt und eine Bäckerei. Größere Einkaufsmöglichkeiten finden Sie in Lienz (ca. 30 Minuten Fahrt).",
      },
      {
        question: "Welche Aktivitäten gibt es im Sommer?",
        answer:
          "Im Sommer bietet die Region zahllose Wanderwege, Klettersteige, Mountainbike-Trails und die Kalser Glocknerstraße zum Lucknerhaus. Der Nationalpark Hohe Tauern liegt direkt vor der Tür.",
      },
    ],
  },
];

export default function FAQPage() {
  const allItems = faqGroups.flatMap((g) => g.items);

  return (
    <>
    <FAQJsonLd items={allItems} />
    <div className="pt-28 pb-24">
      <Container narrow>
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
            Häufige Fragen
          </h1>
          <p className="text-lg text-stone-500">
            Hier finden Sie Antworten auf die wichtigsten Fragen rund um Ihren
            Aufenthalt.
          </p>
        </div>

        <div className="space-y-12">
          {faqGroups.map((group) => (
            <div key={group.category}>
              <h2 className="text-xl font-semibold text-stone-900 mb-6">
                {group.category}
              </h2>
              <FAQAccordion items={group.items} />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-stone-50 rounded-2xl p-8">
          <h3 className="text-lg font-semibold text-stone-900 mb-2">
            Noch Fragen?
          </h3>
          <p className="text-stone-500 mb-6">
            Wir helfen Ihnen gerne weiter – kontaktieren Sie uns!
          </p>
          <Link
            href="/kontakt"
            className="inline-flex bg-alpine-600 hover:bg-alpine-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            Kontakt aufnehmen
          </Link>
        </div>
      </Container>
    </div>
    </>
  );
}
