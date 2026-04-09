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
              denen Sie persönlich identifiziert werden können. Ausführliche
              Informationen zum Thema Datenschutz entnehmen Sie unserer
              nachfolgenden Datenschutzerklärung.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              2. Verantwortliche Stelle
            </h2>
            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser
              Website ist:
            </p>
            <p>
              {contact.ownerName}
              <br />
              Vertreten durch: {contact.ownerRepresentatives}
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
            <p>
              Verantwortliche Stelle ist die natürliche oder juristische Person,
              die allein oder gemeinsam mit anderen über die Zwecke und Mittel
              der Verarbeitung von personenbezogenen Daten entscheidet.
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
              Adresse, Reisezeitraum, Anzahl der Gäste, besondere Wünsche) zum
              Zwecke der Bearbeitung Ihrer Buchungsanfrage gespeichert und
              verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Erfüllung eines Vertrags bzw. vorvertragliche Maßnahmen).
            </p>
            <p>
              Die Daten werden in einer Datenbank gespeichert und nach
              Abschluss des Aufenthalts für die Dauer der gesetzlichen
              Aufbewahrungsfristen (7 Jahre gemäß § 132 BAO) aufbewahrt
              und anschließend gelöscht, sofern keine längere Speicherung
              gesetzlich erforderlich ist.
            </p>

            <h3 className="text-lg font-semibold text-stone-800">
              Kontaktformular
            </h3>
            <p>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden
              Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen
              dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage
              und für den Fall von Anschlussfragen bei uns gespeichert.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bzw. Art. 6
              Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung
              Ihrer Anfrage). Die Daten werden gelöscht, sobald die Anfrage
              abschließend bearbeitet wurde und keine weitere Speicherung
              erforderlich ist.
            </p>

            <h3 className="text-lg font-semibold text-stone-800">
              E-Mail-Versand
            </h3>
            <p>
              Bei einer Buchung oder Kontaktanfrage werden automatisch E-Mails
              versendet (Buchungsbestätigung, Benachrichtigung). Der Versand
              erfolgt über den E-Mail-Dienst von IONOS SE, Elgendorfer Str.
              57, 56410 Montabaur, Deutschland. IONOS verarbeitet Ihre
              E-Mail-Adresse und den Nachrichteninhalt zum Zwecke der
              Zustellung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              4. Hosting und Infrastruktur
            </h2>

            <h3 className="text-lg font-semibold text-stone-800">
              Vercel
            </h3>
            <p>
              Diese Website wird gehostet bei Vercel Inc., 340 S Lemon Ave
              #4133, Walnut, CA 91789, USA. Wenn Sie unsere Website besuchen,
              werden Ihre Daten (z.B. IP-Adresse, Browsertyp, Zeitpunkt des
              Zugriffs) auf Servern von Vercel verarbeitet. Dies ist
              erforderlich, um die Website auszuliefern. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
              zuverlässigen Darstellung unserer Website). Vercel verfügt über
              eine Zertifizierung nach dem EU-US Data Privacy Framework.
            </p>

            <h3 className="text-lg font-semibold text-stone-800">
              Supabase
            </h3>
            <p>
              Für die Speicherung von Buchungs- und Kontaktdaten nutzen wir
              Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992.
              Die Daten werden auf Servern in der EU (Frankfurt, Deutschland)
              gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung). Wir haben mit Supabase einen
              Auftragsverarbeitungsvertrag (AVV) geschlossen.
            </p>

            <h3 className="text-lg font-semibold text-stone-800">
              Smoobu (Channel Manager)
            </h3>
            <p>
              Zur Verwaltung der Verfügbarkeiten und Synchronisierung mit
              Buchungsplattformen nutzen wir Smoobu GmbH, Wikingerufer 7,
              10555 Berlin, Deutschland. Smoobu erhält dabei Informationen
              über belegte Zeiträume unserer Unterkünfte. Personenbezogene
              Gästeinformationen werden nicht an Smoobu übermittelt.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an einer effizienten Belegungsplanung).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              5. Kartendienst
            </h2>

            <h3 className="text-lg font-semibold text-stone-800">
              Contwise Maps
            </h3>
            <p>
              Auf unseren Regionsseiten verwenden wir interaktive Karten
              von Contwise Maps (phoenix.contwise.io), einem Dienst der
              Contwise GmbH, Österreich. Beim Aufrufen einer Seite mit
              eingebetteter Karte wird eine Verbindung zu den Servern von
              Contwise hergestellt. Dabei können Ihre IP-Adresse sowie
              technische Daten (Browsertyp, Zeitpunkt des Zugriffs) an
              Contwise übermittelt werden. Rechtsgrundlage ist Art. 6
              Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
              ansprechenden Darstellung unserer Angebote und der leichten
              Auffindbarkeit der von uns auf der Website angegebenen Orte).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              6. Schriftarten
            </h2>
            <p>
              Diese Website nutzt die Schriftarten &ldquo;Inter&rdquo; und
              &ldquo;Playfair Display&rdquo; von Google Fonts. Die Schriftarten
              werden beim Erstellen der Website heruntergeladen und direkt
              von unserem Server ausgeliefert. Es findet keine Verbindung
              zu Servern von Google statt, wenn Sie unsere Website besuchen.
              Es werden keine Daten an Google übermittelt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              7. Cookies
            </h2>
            <p>
              Diese Website verwendet ausschließlich technisch notwendige
              Cookies. Es werden keine Tracking-Cookies, Marketing-Cookies
              oder Cookies von Drittanbietern eingesetzt. Ein technisch
              notwendiges Cookie speichert Ihre Cookie-Einstellungen. Dieses
              Cookie wird für 365 Tage gespeichert. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
              Funktionsfähigkeit der Website).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              8. Ihre Rechte
            </h2>
            <p>
              Sie haben gemäß DSGVO folgende Rechte bezüglich Ihrer
              personenbezogenen Daten:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie können
                Auskunft über Ihre bei uns gespeicherten Daten verlangen.
              </li>
              <li>
                <strong>Berichtigungsrecht</strong> (Art. 16 DSGVO): Sie
                können die Berichtigung unrichtiger Daten verlangen.
              </li>
              <li>
                <strong>Löschungsrecht</strong> (Art. 17 DSGVO): Sie können
                die Löschung Ihrer Daten verlangen, sofern keine gesetzliche
                Aufbewahrungspflicht besteht.
              </li>
              <li>
                <strong>Einschränkung der Verarbeitung</strong> (Art. 18
                DSGVO): Sie können die Einschränkung der Verarbeitung Ihrer
                Daten verlangen.
              </li>
              <li>
                <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Sie
                können Ihre Daten in einem maschinenlesbaren Format erhalten.
              </li>
              <li>
                <strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Sie
                können der Verarbeitung Ihrer Daten widersprechen.
              </li>
            </ul>
            <p>
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
              {contact.email}
            </p>
            <p>
              Sie haben zudem das Recht, sich bei der zuständigen
              Datenschutzbehörde zu beschweren:
            </p>
            <p>
              Österreichische Datenschutzbehörde
              <br />
              Barichgasse 40–42, 1030 Wien
              <br />
              E-Mail: dsb@dsb.gv.at
              <br />
              Website: www.dsb.gv.at
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              9. Ortstaxe / Meldepflicht
            </h2>
            <p>
              Gemäß dem Tiroler Aufenthaltsabgabegesetz und dem
              Meldegesetz sind wir verpflichtet, bestimmte Daten unserer
              Gäste (Name, Geburtsdatum, Staatsangehörigkeit, Ankunfts-
              und Abreisedatum) an die Gemeinde Kals am Großglockner zu
              melden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO
              (rechtliche Verpflichtung).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              10. Änderung der Datenschutzerklärung
            </h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen,
              damit sie stets den aktuellen rechtlichen Anforderungen
              entspricht oder um Änderungen unserer Leistungen
              umzusetzen. Für Ihren erneuten Besuch gilt dann die neue
              Datenschutzerklärung.
            </p>
            <p>Stand: April 2026</p>
          </section>
        </div>
      </Container>
    </div>
  );
}
