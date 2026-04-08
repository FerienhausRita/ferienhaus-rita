import { Metadata } from "next";
import Container from "@/components/ui/Container";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Buchungsbedingungen & Hausregeln",
  description:
    "Allgemeine Geschäftsbedingungen, Stornobedingungen und Hausregeln für Ihre Buchung im Ferienhaus Rita in Kals am Großglockner.",
};

export default function AGBPage() {
  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
          Buchungsbedingungen & Hausregeln
        </h1>
        <p className="text-stone-500 text-base mb-12">
          Stand: April 2026 · {contact.businessName}, {contact.city}
        </p>

        <div className="prose prose-stone max-w-none text-stone-600 space-y-10">
          {/* 1. Buchung & Bestätigung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              1. Buchung & Bestätigung
            </h2>
            <ul>
              <li>
                Mit dem Absenden der Buchungsanfrage über unsere Website geben
                Sie ein verbindliches Angebot zum Abschluss eines
                Beherbergungsvertrages ab.
              </li>
              <li>
                Der Vertrag kommt erst mit unserer schriftlichen
                Buchungsbestätigung per E-Mail zustande.
              </li>
              <li>
                Sie erhalten innerhalb von 24 Stunden eine Bestätigung oder
                Rückmeldung.
              </li>
              <li>
                Bitte prüfen Sie die Buchungsbestätigung und melden Sie
                eventuelle Unstimmigkeiten umgehend.
              </li>
            </ul>
          </section>

          {/* 2. Preise & Zahlung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              2. Preise & Zahlung
            </h2>
            <ul>
              <li>
                Alle angegebenen Preise verstehen sich{" "}
                <strong>inklusive 10% USt.</strong> (ermäßigter Steuersatz für
                Beherbergung gemäß § 10 Abs. 2 Z 4 UStG).
              </li>
              <li>
                Zusätzlich wird die gesetzliche{" "}
                <strong>Ortstaxe (Kurtaxe)</strong> pro Erwachsener Person und
                Nacht erhoben. Kinder unter 15 Jahren sind befreit.
              </li>
              <li>
                Im Gesamtpreis enthalten sind: Übernachtung, Endreinigung,
                Bettwäsche, Handtücher und Nebenkosten (Strom, Heizung, Wasser,
                WLAN).
              </li>
              <li>
                <strong>Anzahlung:</strong> Innerhalb von 7 Tagen nach
                Buchungsbestätigung ist eine Anzahlung in Höhe von{" "}
                <strong>30% des Gesamtpreises</strong> per Banküberweisung
                fällig.
              </li>
              <li>
                <strong>Restzahlung:</strong> Der Restbetrag ist spätestens{" "}
                <strong>14 Tage vor Anreise</strong> zu begleichen.
              </li>
              <li>
                Bei Buchungen innerhalb von 14 Tagen vor Anreise ist der
                Gesamtbetrag sofort fällig.
              </li>
              <li>
                Die Bankverbindung erhalten Sie mit der Buchungsbestätigung per
                E-Mail.
              </li>
            </ul>
          </section>

          {/* 3. Stornobedingungen */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              3. Stornobedingungen
            </h2>
            <p>
              Eine Stornierung ist jederzeit schriftlich per E-Mail an{" "}
              <a
                href={contact.emailHref}
                className="text-alpine-600 hover:text-alpine-700"
              >
                {contact.email}
              </a>{" "}
              möglich. Es gelten folgende Stornogebühren bezogen auf den
              Gesamtpreis:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="py-2 pr-4 font-semibold text-stone-900">
                      Zeitpunkt der Stornierung
                    </th>
                    <th className="py-2 font-semibold text-stone-900">
                      Stornogebühr
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="py-2 pr-4">
                      Bis 60 Tage vor Anreise
                    </td>
                    <td className="py-2">Kostenlos</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      59 bis 30 Tage vor Anreise
                    </td>
                    <td className="py-2">30% des Gesamtpreises</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      29 bis 14 Tage vor Anreise
                    </td>
                    <td className="py-2">50% des Gesamtpreises</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      13 bis 7 Tage vor Anreise
                    </td>
                    <td className="py-2">70% des Gesamtpreises</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">
                      Weniger als 7 Tage / Nichtanreise
                    </td>
                    <td className="py-2">90% des Gesamtpreises</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              Wir empfehlen den Abschluss einer{" "}
              <strong>Reiserücktrittsversicherung</strong>.
            </p>
            <p className="text-sm">
              Maßgeblich ist das Datum des Eingangs der schriftlichen
              Stornierung. Bei vorzeitiger Abreise wird der volle vereinbarte
              Preis berechnet.
            </p>
          </section>

          {/* 4. An- und Abreise */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              4. An- und Abreise
            </h2>
            <ul>
              <li>
                <strong>Check-in:</strong> Ab 15:00 Uhr am Anreisetag.
              </li>
              <li>
                <strong>Check-out:</strong> Bis 10:00 Uhr am Abreisetag.
              </li>
              <li>
                Abweichende Zeiten sind nach vorheriger Absprache möglich,
                sofern die Belegung es erlaubt.
              </li>
              <li>
                Detaillierte Anreise-Informationen (Schlüsselübergabe, Adresse,
                Parkplatz) erhalten Sie rechtzeitig vor Ihrer Ankunft per E-Mail.
              </li>
            </ul>
          </section>

          {/* 5. Mindestaufenthalt */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              5. Mindestaufenthalt
            </h2>
            <ul>
              <li>
                <strong>Hochsaison</strong> (Weihnachten/Neujahr, Februar/März,
                Juli/August): Mindestens <strong>5 Nächte</strong>.
              </li>
              <li>
                <strong>Zwischensaison</strong> (Januar, März/April, Juni,
                September/Oktober): Mindestens <strong>3 Nächte</strong>.
              </li>
              <li>
                <strong>Nebensaison</strong> (restliche Zeiträume): Mindestens{" "}
                <strong>2 Nächte</strong>.
              </li>
            </ul>
          </section>

          {/* 6. Hausregeln */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              6. Hausregeln
            </h2>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Allgemeines
            </h3>
            <ul>
              <li>
                Bitte behandeln Sie die Wohnung und das Inventar sorgfältig und
                melden Sie Schäden oder Mängel umgehend.
              </li>
              <li>
                Die Wohnung ist bei Abreise in besenreinem Zustand zu
                hinterlassen (Geschirr abgewaschen, Müll entsorgt, Kühlschrank
                geleert).
              </li>
              <li>
                Die maximale Personenanzahl pro Wohnung darf nicht
                überschritten werden.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Ruhezeiten
            </h3>
            <ul>
              <li>
                Bitte beachten Sie die <strong>Ruhezeiten von 22:00 bis 07:00 Uhr</strong>.
              </li>
              <li>
                Bitte nehmen Sie Rücksicht auf die anderen Gäste und Nachbarn.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Rauchen
            </h3>
            <ul>
              <li>
                In allen Wohnungen und Gemeinschaftsräumen gilt ein striktes{" "}
                <strong>Rauchverbot</strong>.
              </li>
              <li>
                Rauchen ist ausschließlich im Außenbereich gestattet. Bitte
                Aschenbecher verwenden.
              </li>
              <li>
                Bei Verstoß gegen das Rauchverbot wird eine Reinigungspauschale
                von 200 € erhoben.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Haustiere
            </h3>
            <ul>
              <li>
                Hunde sind in allen Wohnungen <strong>herzlich willkommen</strong>{" "}
                (max. 2 Hunde pro Wohnung).
              </li>
              <li>
                Es fällt eine Gebühr pro Hund und Nacht an (siehe Preise).
              </li>
              <li>
                Hunde dürfen nicht auf Betten oder Polstermöbeln liegen. Bitte
                bringen Sie eine eigene Decke/Korb mit.
              </li>
              <li>
                Hundekot muss im Außenbereich sofort entfernt werden.
              </li>
              <li>Andere Haustiere nur nach vorheriger Absprache.</li>
            </ul>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Müll & Recycling
            </h3>
            <ul>
              <li>
                Bitte trennen Sie den Müll entsprechend der Kennzeichnung in
                der Wohnung (Restmüll, Papier, Glas, Verpackungen, Bio).
              </li>
              <li>
                Die Mülltonnen befinden sich im Außenbereich des Hauses.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-stone-800 mt-4">
              Parken
            </h3>
            <ul>
              <li>
                Kostenlose Parkplätze stehen direkt am Haus zur Verfügung.
              </li>
              <li>
                Bitte parken Sie nur auf den markierten Stellflächen.
              </li>
            </ul>
          </section>

          {/* 7. Haftung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              7. Haftung & Kaution
            </h2>
            <ul>
              <li>
                Der Gast haftet für alle während des Aufenthalts verursachten
                Schäden an der Wohnung und dem Inventar.
              </li>
              <li>
                Eine Kaution wird derzeit nicht erhoben. Wir behalten uns vor,
                bei grobem Verschulden Schadensersatz geltend zu machen.
              </li>
              <li>
                Für den Verlust von Wertgegenständen, Geld oder persönlichen
                Gegenständen wird keine Haftung übernommen.
              </li>
            </ul>
          </section>

          {/* 8. Schlussbestimmungen */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900">
              8. Schlussbestimmungen
            </h2>
            <ul>
              <li>
                Es gilt österreichisches Recht. Gerichtsstand ist Lienz.
              </li>
              <li>
                Sollten einzelne Bestimmungen unwirksam sein, bleibt die
                Wirksamkeit der übrigen Bestimmungen unberührt.
              </li>
              <li>
                Änderungen dieser Bedingungen werden auf der Website
                veröffentlicht und gelten für alle ab dem Zeitpunkt der
                Veröffentlichung abgeschlossenen Buchungen.
              </li>
            </ul>
          </section>

          {/* Kontakt */}
          <section className="bg-stone-50 rounded-2xl p-6 sm:p-8 not-prose">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">
              Fragen?
            </h2>
            <p className="text-stone-600 text-sm mb-4">
              Bei Fragen zu unseren Buchungsbedingungen oder Hausregeln
              kontaktieren Sie uns gerne:
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href={contact.emailHref}
                className="inline-flex items-center gap-2 text-alpine-600 hover:text-alpine-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {contact.email}
              </a>
              <a
                href={contact.phoneHref}
                className="inline-flex items-center gap-2 text-alpine-600 hover:text-alpine-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {contact.phone}
              </a>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
