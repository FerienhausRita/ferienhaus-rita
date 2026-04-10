import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");

const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const guestGuide = [
  {
    title: "Anreise & Aufenthalt",
    icon: "home",
    items: [
      {
        title: "Anreise & Abreise",
        content:
          "Ihre Wohnung ist am Anreisetag ab 16:00 Uhr bezugsfertig. Am Abreisetag bitten wir Sie, die Wohnung bis 10:00 Uhr freizugeben. Bitte geben Sie uns kurz Bescheid, wann Sie Ihre Abreise planen. Abweichende Zeiten sind in manchen Fällen nach Absprache möglich.",
      },
      {
        title: "Check-out",
        content:
          "Wir würden uns sehr freuen, wenn Sie die Wohnung ordentlich und mit sauberem Geschirr hinterlassen. Sollte während Ihres Aufenthalts einmal etwas zu Bruch gehen, bitten wir Sie, uns kurz zu informieren, damit wir es für die nächsten Gäste ersetzen können.",
      },
      {
        title: "Schlüssel",
        content:
          "Sollte er einmal verloren gehen, müssen wir leider die Kosten für den Austausch des Schlosses berechnen.",
      },
      {
        title: "Parken",
        content:
          "Parkplätze stehen Ihnen direkt am Haus zur Verfügung.",
      },
      {
        title: "Ruhezeiten",
        content:
          "Wir bitten um Rücksichtnahme auf andere Gäste. Bitte vermeiden Sie Lärm, insbesondere zwischen 22:00 und 07:00 Uhr.",
      },
    ],
  },
  {
    title: "Wohnung & Ausstattung",
    icon: "home",
    items: [
      {
        title: "Internet / WLAN",
        content:
          "WLAN steht Ihnen kostenfrei zur Verfügung. Das Passwort finden Sie am Ende dieser Mappe oder am Router in Ihrer Wohnung.",
      },
      {
        title: "Küche",
        content:
          "Jede Wohnung verfügt über eine voll ausgestattete Küche. Bitte schalten Sie beim Kochen den Dunstabzug ein, da sich ein Rauchmelder in unmittelbarer Nähe befindet.",
      },
      {
        title: "Fernsehen",
        content:
          "Die Wohnungen sind mit einem Smart-TV ausgestattet. Bitte denken Sie daran, sich bei persönlichen Streaming-Diensten am Ende Ihres Aufenthalts wieder abzumelden.",
      },
      {
        title: "Heizung",
        content:
          "Die Temperatur Ihrer Wohnung regulieren Sie bequem über die Thermostate.",
      },
      {
        title: "Bettwäsche & Handtücher",
        content:
          "Bettwäsche und Handtücher sind für Sie vorbereitet. Ein Wechsel ist auf Wunsch gegen Aufpreis möglich.",
      },
      {
        title: "Zusätzliche Decken",
        content:
          "Zusätzliche Wolldecken finden Sie im Kleiderschrank oder auf Anfrage.",
      },
      {
        title: "Tresor",
        content:
          "Im Schlafzimmer steht Ihnen ein Tresor zur Aufbewahrung Ihrer Wertgegenstände zur Verfügung. Für Wertgegenstände wird keine Haftung übernommen.",
      },
      {
        title: "Aufenthaltsraum",
        content:
          "Unser Aufenthaltsraum steht Ihnen jederzeit zur Verfügung.",
      },
      {
        title: "Waschmaschine",
        content:
          "Gerne stellen wir Ihnen im Notfall auf Anfrage eine Waschmöglichkeit zur Verfügung. Hierfür berechnen wir eine kleine Gebühr von 10 €.",
      },
    ],
  },
  {
    title: "Hausregeln",
    icon: "home",
    items: [
      {
        title: "Rauchen",
        content:
          "Das Rauchen ist in allen Innenräumen nicht gestattet. Dies gilt auch für E-Zigaretten und ähnliche Geräte.",
      },
      {
        title: "Grillen",
        content:
          "Grillen ist aus brandschutzrechtlichen Gründen nicht erlaubt.",
      },
      {
        title: "Haustiere",
        content:
          "Hunde sind bei uns herzlich willkommen!\n\n**Kuschelzone:** Zum Schutz der Einrichtung reservieren wir Betten und Sofas für die Zweibeiner.\n\n**Alleinsein:** Bitte lassen Sie Ihren Hund nur dann allein in der Wohnung, wenn er sich dort entspannt verhält und nicht bellt.\n\n**Sauberes Kals:** Bitte entsorgen Sie Hinterlassenschaften im Außenbereich direkt. Passende Tüten halten wir bereit.\n\nVielen Dank für Ihre Mithilfe!",
      },
      {
        title: "Müll",
        content:
          "Wir bitten Sie, Ihren Müll entsprechend der örtlichen Vorgaben zu trennen. Eine Beschreibung finden Sie in der Küche. Die Mülltonnen befinden sich vor dem Haus.",
      },
      {
        title: "Feuer",
        content:
          "Sollte ein Rauchmelder auslösen, bitten wir Sie, die Wohnung umgehend zu verlassen. Um einen Fehlalarm zu vermeiden, schalten Sie bitte beim Kochen stets den Dunstabzug ein.",
      },
      {
        title: "Kinder",
        content:
          "Ein Babybett oder Hochstuhl steht Ihnen auf Wunsch zur Verfügung.",
      },
    ],
  },
  {
    title: "Services",
    icon: "activity",
    items: [
      {
        title: "Brötchenservice",
        content:
          "Für Ihren Aufenthalt steht Ihnen ein Brötchenservice zur Verfügung.\n\nIhre Bestellung tragen Sie bitte in das in Ihrer Wohnung ausliegende Bestellbuch ein, die Preisliste liegt bereit.\n\nDas Buch legen Sie anschließend in die bereitliegende Stofftasche, die außen am Haus an den vorgesehenen Haken aufgehängt wird. Dort werden am Morgen auch Ihre bestellten Brötchen für Sie hinterlegt.\n\nPro Lieferung wird eine Servicepauschale von 1 € berechnet. Den Gesamtbetrag ermitteln Sie bitte selbst und hinterlegen ihn am Ende Ihres Aufenthalts bar im bereitliegenden Kuvert.",
      },
      {
        title: "Einkaufen",
        content:
          "**MPREIS**\nKödnitz 23, 9981 Kals am Großglockner\n\nEine kleinere Auswahl finden Sie im Gradonna Mountain Resort.\n\nFür ein erweitertes Angebot empfiehlt sich Lienz.",
      },
      {
        title: "Taxi",
        content:
          "**Glocknertaxi**\nTel. +43 664 521 90 89",
      },
      {
        title: "Zusätzliche Leistungen",
        content:
          "Sprechen Sie uns jederzeit an – wir helfen Ihnen gerne weiter.",
      },
    ],
  },
  {
    title: "Skifahren & Winter",
    icon: "activity",
    items: [
      {
        title: "Skigebiet",
        content:
          "Das Skigebiet rund um das Ferienhaus Rita gehört zum Großglockner Resort Kals-Matrei und bietet ideale Bedingungen für Skifahrer und Snowboarder.",
      },
      {
        title: "Ski-in & Ski-out",
        content:
          "Genießen Sie den Luxus, direkt an der Piste zu wohnen. Bei ausreichender Schneelage schnallen Sie Ihre Skier unmittelbar vor der Haustür an und gleiten entspannt zur Figol-Talstation. Nach einem herrlichen Skitag führt Sie die Abfahrt direkt wieder zurück zum Ferienhaus Rita.",
      },
      {
        title: "Skipass",
        content:
          "Ihre Skipässe erhalten Sie direkt an der Talstation der Gondelbahn Kals I.",
      },
      {
        title: "Skiverleih",
        content:
          "**Sport Michl (SPORT 2000)**\nAm Dorfplatz, wenige Gehminuten entfernt\nUnsere Gäste erhalten hier einen Rabatt\n\n**Alpinsport Gratz**\nDirekt an der Talstation der Gondelbahn Kals I",
      },
      {
        title: "Skischule",
        content:
          "**Skischule Kals am Großglockner**\nTelefon: +43 676 9120550\nE-Mail: skischulekals@gmail.com\nWebsite: skischulekals.com",
      },
      {
        title: "Skiraum",
        content:
          "Ein beheizter Skiraum steht Ihnen im Keller des Hauses zur Verfügung.",
      },
    ],
  },
  {
    title: "Notfall & Gesundheit",
    icon: "phone",
    items: [
      {
        title: "Notruf",
        content:
          "**Europäischer Notruf:** 112\n**Rettung:** 144\n**Apothekenruf:** 1455\n\nDas nächstgelegene Krankenhaus befindet sich in Lienz.",
      },
      {
        title: "Arzt",
        content:
          "**Dr. Silvia Weger**\nKödnitz 15, 9981 Kals am Großglockner\nTel. +43 4872 83827\n\n**Ordination Kals:** Di 08:00 – 11:00 Uhr\n\n**Ordination Huben:**\nMo 08:00 – 13:00 & 16:00 – 18:00 Uhr\nDi 08:00 – 13:00 Uhr\nDo 08:00 – 11:00 & 16:00 – 18:00 Uhr\nFr 08:00 – 11:00 Uhr\n\nHausärztlicher Notdienst: 141\nWeitere ärztliche Versorgung in Matrei und Lienz.",
      },
      {
        title: "Apotheke",
        content:
          "**Tauern Apotheke**\nTauerntalstraße 5, 9971 Matrei in Osttirol\n\nWeitere Apotheken finden Sie in Lienz.",
      },
    ],
  },
  {
    title: "Kontakt",
    icon: "phone",
    items: [
      {
        title: "Ihr Gastgeber",
        content:
          "Sollte während Ihres Aufenthalts etwas nicht funktionieren oder sollten Sie einen Wunsch haben, melden Sie sich jederzeit gerne bei uns.\n\n**Telefon:** +49 152 34518873 (Familie Berger)\n**E-Mail:** info@ferienhaus-rita-kals.at",
      },
    ],
  },
];

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/site_settings?on_conflict=key`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      key: "guest_guide",
      value: guestGuide,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error ${res.status}: ${text}`);
    process.exit(1);
  }

  console.log(`Upserted guest_guide successfully (status ${res.status})`);
}

main();
