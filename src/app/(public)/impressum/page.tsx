import { Metadata } from "next";
import Container from "@/components/ui/Container";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-8">
          Impressum
        </h1>
        <div className="prose prose-stone max-w-none space-y-6 text-stone-600">
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              Angaben gemäß § 5 ECG
            </h2>
            <p>
              {contact.ownerName}
              <br />
              {contact.businessName}
              <br />
              {contact.street}
              <br />
              {contact.zip} {contact.city}
              <br />
              {contact.country}
            </p>
            <p>
              Vertreten durch: {contact.ownerRepresentatives}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">Kontakt</h2>
            <p>
              Telefon: {contact.phone}
              <br />
              E-Mail: {contact.email}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              Steuernummern
            </h2>
            <p>
              Steuernummer: {contact.taxNumber}
              <br />
              Umsatzsteuer-Identifikationsnummer gemäß § 27a
              Umsatzsteuergesetz: {contact.uid}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              Aufsichtsbehörde
            </h2>
            <p>{contact.authority}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit. Wir sind nicht bereit oder
              verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              Haftung für Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch
              nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die
              auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </section>
        </div>
      </Container>
    </div>
  );
}
