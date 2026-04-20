import { Metadata } from "next";
import Container from "@/components/ui/Container";
import { contact } from "@/data/contact";
import { getDepositConfig } from "@/lib/deposit-config";

export const metadata: Metadata = {
  title: "Buchungsbedingungen & Hausregeln",
  description:
    "Allgemeine Geschäftsbedingungen, Stornobedingungen und Hausregeln für Ihre Buchung im Ferienhaus Rita in Kals am Großglockner.",
};

export const dynamic = "force-dynamic";

export default async function AGBPage() {
  const depositCfg = await getDepositConfig();
  const depositPct = depositCfg.deposit_percent;
  const remainderDays = depositCfg.remainder_days_before_checkin;
  const depositDueDays = depositCfg.deposit_due_days;
  const refundPct = 100 - depositPct;
  return (
    <div className="pt-28 pb-24">
      <Container narrow>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
          Buchungsbedingungen & Hausregeln
        </h1>
        <p className="text-stone-500 text-base mb-12">
          Stand: April 2026 · {contact.businessName}, {contact.city}
        </p>

        <div className="max-w-none text-stone-600 space-y-12 text-[15px] leading-relaxed text-justify">
          {/* 1. Buchung & Bestätigung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              1. Buchung & Bestätigung
            </h2>
            <p className="mb-3">
              Mit dem Absenden der Buchungsanfrage über unsere Website geben Sie
              ein verbindliches Angebot zum Abschluss eines Beherbergungsvertrages
              ab. Der Vertrag kommt erst mit unserer schriftlichen
              Buchungsbestätigung per E-Mail zustande.
            </p>
            <p className="mb-3">
              Sie erhalten innerhalb von 24 Stunden eine Bestätigung oder
              Rückmeldung. Bitte prüfen Sie die Buchungsbestätigung sorgfältig und
              melden Sie eventuelle Unstimmigkeiten umgehend.
            </p>
          </section>

          {/* 2. Preise & Zahlung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              2. Preise & Zahlung
            </h2>
            <p className="mb-3">
              Alle angegebenen Preise verstehen sich{" "}
              <strong>inklusive 10% USt.</strong> (ermäßigter Steuersatz für
              Beherbergung gemäß § 10 Abs. 2 Z 4 UStG). Zusätzlich wird die
              gesetzliche <strong>Ortstaxe (Kurtaxe)</strong> pro erwachsener
              Person und Nacht erhoben. Kinder unter 15 Jahren sind von der
              Ortstaxe befreit.
            </p>
            <p className="mb-3">
              Im Gesamtpreis enthalten sind: Übernachtung, Endreinigung,
              Bettwäsche, Handtücher und Nebenkosten (Strom, Heizung, Wasser,
              WLAN).
            </p>
            <div className="bg-stone-50 rounded-xl p-5 my-5 space-y-2">
              <p>
                <strong>Anzahlung:</strong> Innerhalb von {depositDueDays} Tagen nach
                Buchungsbestätigung ist eine Anzahlung in Höhe von{" "}
                <strong>{depositPct}% des Gesamtpreises</strong> per Banküberweisung fällig.
              </p>
              <p>
                <strong>Restzahlung:</strong> Der Restbetrag ist spätestens{" "}
                <strong>{remainderDays} Tage vor Anreise</strong> zu begleichen.
              </p>
              <p>
                Bei Buchungen innerhalb von {remainderDays} Tagen vor Anreise ist der
                Gesamtbetrag sofort fällig.
              </p>
            </div>
            <p>
              Die Bankverbindung erhalten Sie mit der Buchungsbestätigung per
              E-Mail.
            </p>
          </section>

          {/* 3. Stornobedingungen */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              3. Stornobedingungen
            </h2>
            <p className="mb-4">
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
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-stone-200 text-left">
                    <th className="py-3 pr-4 font-semibold text-stone-900">
                      Zeitpunkt der Stornierung
                    </th>
                    <th className="py-3 font-semibold text-stone-900">
                      Erstattung
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="py-3 pr-4">Bis 60 Tage vor Anreise</td>
                    <td className="py-3 text-emerald-600 font-medium">
                      Kostenlose Stornierung
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">59 bis {remainderDays} Tage vor Anreise</td>
                    <td className="py-3">
                      {refundPct}% Erstattung ({depositPct}% Stornogebühr)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-stone-900">
                      Weniger als {remainderDays} Tage vor Anreise
                    </td>
                    <td className="py-3 font-medium text-stone-900">
                      Keine Erstattung
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Nichtanreise / No-Show</td>
                    <td className="py-3">Keine Erstattung</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3">
              Maßgeblich ist das Datum des Eingangs der schriftlichen Stornierung.
              Bei vorzeitiger Abreise wird der volle vereinbarte Preis berechnet.
            </p>
            <p>
              Wir empfehlen den Abschluss einer{" "}
              <strong>Reiserücktrittsversicherung</strong>.
            </p>
          </section>

          {/* 4. An- und Abreise */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              4. An- und Abreise
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-stone-50 rounded-xl p-5 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Check-in</p>
                <p className="text-2xl font-bold text-stone-900">ab 16:00 Uhr</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-5 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Check-out</p>
                <p className="text-2xl font-bold text-stone-900">bis 10:00 Uhr</p>
              </div>
            </div>
            <p className="mb-3">
              Abweichende Zeiten sind nach vorheriger Absprache möglich, sofern
              die Belegung es erlaubt. Detaillierte Anreise-Informationen
              (Schlüsselübergabe, Adresse, Parkplatz) erhalten Sie rechtzeitig
              vor Ihrer Ankunft per E-Mail.
            </p>
          </section>

          {/* 5. Mindestaufenthalt */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              5. Mindestaufenthalt
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Hochsaison</p>
                <p className="text-xl font-bold text-stone-900">5 Nächte</p>
                <p className="text-xs text-stone-500 mt-1">Weihnachten, Feb/Mär, Jul/Aug</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Zwischensaison</p>
                <p className="text-xl font-bold text-stone-900">3 Nächte</p>
                <p className="text-xs text-stone-500 mt-1">Jan, Mär/Apr, Jun, Sep/Okt</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Nebensaison</p>
                <p className="text-xl font-bold text-stone-900">2 Nächte</p>
                <p className="text-xs text-stone-500 mt-1">Restliche Zeiträume</p>
              </div>
            </div>
          </section>

          {/* 6. Hausregeln */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              6. Hausregeln
            </h2>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Allgemeines
            </h3>
            <p className="mb-3">
              Bitte behandeln Sie die Wohnung und das Inventar sorgfältig und
              melden Sie Schäden oder Mängel umgehend. Die Wohnung ist bei
              Abreise in besenreinem Zustand zu hinterlassen (Geschirr
              abgewaschen, Müll entsorgt, Kühlschrank geleert). Die maximale
              Personenanzahl pro Wohnung darf nicht überschritten werden.
            </p>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Ruhezeiten
            </h3>
            <p className="mb-3">
              Bitte beachten Sie die{" "}
              <strong>Ruhezeiten von 22:00 bis 07:00 Uhr</strong> und nehmen Sie
              Rücksicht auf die anderen Gäste und Nachbarn.
            </p>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Rauchen
            </h3>
            <p className="mb-3">
              In allen Wohnungen und Gemeinschaftsräumen gilt ein striktes{" "}
              <strong>Rauchverbot</strong>. Rauchen ist ausschließlich im
              Außenbereich gestattet – bitte Aschenbecher verwenden. Bei Verstoß
              gegen das Rauchverbot wird eine Reinigungspauschale von 200 €
              erhoben.
            </p>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Haustiere
            </h3>
            <p className="mb-3">
              Hunde sind in allen Wohnungen{" "}
              <strong>herzlich willkommen</strong> (max. 2 Hunde pro Wohnung).
              Es fällt eine Gebühr pro Hund und Nacht an (siehe Preise). Hunde
              dürfen nicht auf Betten oder Polstermöbeln liegen – bitte bringen
              Sie eine eigene Decke oder einen Korb mit. Hundekot muss im
              Außenbereich sofort entfernt werden. Andere Haustiere nur nach
              vorheriger Absprache.
            </p>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Müll & Recycling
            </h3>
            <p className="mb-3">
              Bitte trennen Sie den Müll entsprechend der Kennzeichnung in der
              Wohnung (Restmüll, Papier, Glas, Verpackungen, Bio). Die
              Mülltonnen befinden sich im Außenbereich des Hauses.
            </p>

            <h3 className="text-base font-semibold text-stone-800 mt-6 mb-2 text-left">
              Parken
            </h3>
            <p className="mb-3">
              Kostenlose Parkplätze stehen direkt am Haus zur Verfügung. Bitte
              parken Sie nur auf den markierten Stellflächen.
            </p>
          </section>

          {/* 7. Haftung */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              7. Haftung
            </h2>
            <p className="mb-3">
              Der Gast haftet für alle während des Aufenthalts verursachten Schäden
              an der Wohnung und dem Inventar. Es wird keine Kaution erhoben. Für
              den Verlust von Wertgegenständen, Geld oder persönlichen
              Gegenständen wird keine Haftung übernommen.
            </p>
          </section>

          {/* 8. Schlussbestimmungen */}
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-4 text-left">
              8. Schlussbestimmungen
            </h2>
            <p className="mb-3">
              Es gilt österreichisches Recht. Gerichtsstand ist Lienz. Sollten
              einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der
              übrigen Bestimmungen unberührt. Änderungen dieser Bedingungen werden
              auf der Website veröffentlicht und gelten für alle ab dem Zeitpunkt
              der Veröffentlichung abgeschlossenen Buchungen.
            </p>
          </section>

          {/* Kontakt */}
          <section className="bg-stone-50 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-stone-900 mb-2 text-left">
              Fragen?
            </h2>
            <p className="text-stone-600 text-sm mb-4 text-left">
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
