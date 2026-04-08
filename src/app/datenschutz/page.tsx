import { Metadata } from "next";
import Container from "@/components/ui/Container";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function DatenschutzPage() {
  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-8">
          Datenschutzerklärung
        </h1>
        <div className="prose prose-stone max-w-none space-y-6 text-stone-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              1. Datenschutz auf einen Blick
            </h2>
            <h3 className="text-lg font-semibold text-stone-800">
              Allgemeine Hinweise
            </h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber,
              was mit Ihren personenbezogenen Daten passiert, wenn Sie diese
              Website besuchen. Personenbezogene Daten sind alle Daten, mit
              denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              2. Verantwortliche Stelle
            </h2>
            <p>
              {contact.ownerName}
              <br />
              {contact.street}
              <br />
              {contact.zip} {contact.city}
              <br />
              {contact.country}
              <br />
              <br />
              Telefon: {contact.phone}
              <br />
              E-Mail: {contact.email}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              3. Datenerfassung auf dieser Website
            </h2>
            <h3 className="text-lg font-semibold text-stone-800">
              Buchungsanfragen
            </h3>
            <p>
              Wenn Sie über unser Buchungsformular eine Anfrage stellen,
              werden die von Ihnen eingegebenen Daten (Name, E-Mail, Telefon,
              Adresse, Reisezeitraum) zum Zwecke der Bearbeitung Ihrer
              Buchungsanfrage gespeichert und verarbeitet. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen).
            </p>
            <h3 className="text-lg font-semibold text-stone-800">
              Kontaktformular
            </h3>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden
              Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen
              dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage
              und für den Fall von Anschlussfragen bei uns gespeichert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              4. Ihre Rechte
            </h2>
            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über
              Herkunft, Empfänger und Zweck Ihrer gespeicherten
              personenbezogenen Daten zu erhalten. Sie haben außerdem ein
              Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
              Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie
              sich jederzeit an uns wenden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              5. Hosting
            </h2>
            <p>
              Diese Website wird bei einem externen Dienstleister gehostet
              (Hoster). Die personenbezogenen Daten, die auf dieser Website
              erfasst werden, werden auf den Servern des Hosters gespeichert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              6. Cookies
            </h2>
            <p>
              Diese Website verwendet nur technisch notwendige Cookies. Es
              werden keine Tracking-Cookies oder Marketing-Cookies verwendet.
            </p>
          </section>

          <p className="text-stone-400 text-xs mt-8">
            Hinweis: Diese Datenschutzerklärung ist ein Entwurf und muss durch
            einen Rechtsanwalt geprüft und an die tatsächlichen Gegebenheiten
            angepasst werden.
          </p>
        </div>
      </Container>
    </div>
  );
}
