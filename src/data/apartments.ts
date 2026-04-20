export interface Apartment {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  size: number;
  maxGuests: number;
  baseGuests: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  /** @deprecated Use summerPrice/winterPrice instead */
  basePrice: number;
  /** Summer price per night (May 1 – Nov 30) */
  summerPrice: number;
  /** Winter price per night (Dec 1 – Apr 30) */
  winterPrice: number;
  extraPersonPrice: number;
  cleaningFee: number;
  dogFee: number;
  /** Min nights in summer season */
  minNightsSummer: number;
  /** Min nights in winter season */
  minNightsWinter: number;
  features: string[];
  highlights: string[];
  amenities: AmenityGroup[];
  images: string[];
  available: boolean;
}

export interface AmenityGroup {
  category: string;
  items: string[];
}

export const apartments: Apartment[] = [
  {
    id: "grossglockner-suite",
    slug: "grossglockner-suite",
    name: "Großglockner Suite",
    subtitle: "Geräumige Alpensuite für Familien & Gruppen",
    description:
      "Unsere großzügige Großglockner Suite bietet auf 96 m² alles, was Sie für einen perfekten Urlaub in den Alpen brauchen. Die lichtdurchflutete Wohnung besticht durch hochwertige Materialien, eine voll ausgestattete Küche und einen atemberaubenden Blick auf die umliegende Bergwelt. Ideal für Familien oder Gruppen, die Wert auf Platz und Komfort legen.",
    shortDescription:
      "96 m² alpine Wohnkultur mit Bergpanorama – perfekt für Familien und Gruppen bis 6 Personen.",
    size: 96,
    maxGuests: 6,
    baseGuests: 4,
    bedrooms: 3,
    bathrooms: 1,
    floor: "Dachgeschoss",
    basePrice: 170,
    summerPrice: 170,
    winterPrice: 170,
    extraPersonPrice: 20,
    cleaningFee: 100,
    dogFee: 15,
    minNightsSummer: 3,
    minNightsWinter: 5,
    features: [
      "Bergpanorama",
      "Voll ausgestattete Küche",
      "Großer Wohn-/Essbereich",
      "Balkon mit Bergblick",
      "Skiraum",
      "Parkplatz",
    ],
    highlights: [
      "96 m² Wohnfläche",
      "Bis zu 6 Personen",
      "Direkter Bergblick",
      "Familienfreundlich",
    ],
    amenities: [
      {
        category: "Wohnen",
        items: [
          "Offener Wohn-/Essbereich",
          "Gemütliche Sitzecke",
          "Flachbild-TV",
          "WLAN",
          "Holzboden",
        ],
      },
      {
        category: "Küche",
        items: [
          "Voll ausgestattete Küche",
          "Geschirrspüler",
          "Backofen",
          "Kaffeemaschine",
          "Toaster",
        ],
      },
      {
        category: "Schlafen",
        items: [
          "3 Schlafzimmer",
          "Hochwertige Matratzen",
          "Bettwäsche inklusive",
          "Verdunkelungsvorhänge",
        ],
      },
      {
        category: "Bad",
        items: [
          "Badezimmer mit Dusche",
          "Handtücher inklusive",
          "Föhn",
          "Waschmaschine/Trockner (auf Anfrage)",
        ],
      },
      {
        category: "Außen",
        items: [
          "Balkon mit Bergblick",
          "Skiraum",
          "Parkplatz",
          "Grillplatz",
        ],
      },
    ],
    images: [
      "/images/apartments/grossglockner-suite/living.jpg",
      "/images/apartments/grossglockner-suite/tv.jpg",
      "/images/apartments/grossglockner-suite/bedroom.jpg",
      "/images/apartments/grossglockner-suite/bath.jpg",
      "/images/apartments/grossglockner-suite/view.jpg",
    ],
    available: true,
  },
  {
    id: "gletscherblick",
    slug: "gletscherblick",
    name: "Blauspitz",
    subtitle: "Großzügig wohnen mit Blick auf die Bergwelt der Hohen Tauern",
    description:
      "Die Wohnung Blauspitz bietet auf 96 m² höchsten Komfort mit einem herrlichen Ausblick auf die Hohen Tauern. Moderne alpine Einrichtung, eine vollwertige Küche und großzügige Schlafräume machen diese Wohnung zum idealen Rückzugsort nach einem aktiven Tag in der Natur.",
    shortDescription:
      "96 m² mit Bergpanorama – moderner Komfort für bis zu 6 Personen.",
    size: 96,
    maxGuests: 6,
    baseGuests: 4,
    bedrooms: 3,
    bathrooms: 1,
    floor: "Obergeschoss",
    basePrice: 170,
    summerPrice: 170,
    winterPrice: 170,
    extraPersonPrice: 20,
    cleaningFee: 100,
    dogFee: 15,
    minNightsSummer: 3,
    minNightsWinter: 5,
    features: [
      "Bergblick",
      "Voll ausgestattete Küche",
      "Großer Wohn-/Essbereich",
      "Balkon mit Panoramablick",
      "Skiraum",
      "Parkplatz",
    ],
    highlights: [
      "96 m² Wohnfläche",
      "Bis zu 6 Personen",
      "Bergpanorama",
      "Obergeschoss mit Weitblick",
    ],
    amenities: [
      {
        category: "Wohnen",
        items: [
          "Offener Wohn-/Essbereich",
          "Gemütliche Sitzecke",
          "Flachbild-TV",
          "WLAN",
          "Holzboden",
        ],
      },
      {
        category: "Küche",
        items: [
          "Voll ausgestattete Küche",
          "Geschirrspüler",
          "Backofen",
          "Kaffeemaschine",
          "Toaster",
        ],
      },
      {
        category: "Schlafen",
        items: [
          "3 Schlafzimmer",
          "Hochwertige Matratzen",
          "Bettwäsche inklusive",
          "Verdunkelungsvorhänge",
        ],
      },
      {
        category: "Bad",
        items: [
          "Badezimmer mit Dusche",
          "Handtücher inklusive",
          "Föhn",
          "Waschmaschine/Trockner (auf Anfrage)",
        ],
      },
      {
        category: "Außen",
        items: [
          "Balkon mit Panoramablick",
          "Skiraum",
          "Parkplatz",
          "Grillplatz",
        ],
      },
    ],
    images: [
      "/images/apartments/gletscherblick/living.jpg",
      "/images/apartments/gletscherblick/dining.jpg",
      "/images/apartments/gletscherblick/kitchen.jpg",
      "/images/apartments/gletscherblick/tv.jpg",
      "/images/apartments/gletscherblick/bedroom.jpg",
      "/images/apartments/gletscherblick/bath.jpg",
      "/images/apartments/gletscherblick/view.jpg",
    ],
    available: true,
  },
  {
    id: "almrausch",
    slug: "almrausch",
    name: "Almrausch",
    subtitle: "Gemütliches Alpenapartment für Paare & kleine Familien",
    description:
      "Das Apartment Almrausch ist mit ca. 50 m² ideal für Paare oder kleine Familien. Im Erdgeschoss gelegen mit ebenerdiger Südterrasse. Die warme, alpine Einrichtung und die durchdachte Raumaufteilung schaffen ein gemütliches Zuhause auf Zeit.",
    shortDescription:
      "50 m² alpine Gemütlichkeit – ideal für Paare und kleine Familien bis 4 Personen.",
    size: 50,
    maxGuests: 4,
    baseGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: "Erdgeschoss",
    basePrice: 90,
    summerPrice: 90,
    winterPrice: 90,
    extraPersonPrice: 20,
    cleaningFee: 50,
    dogFee: 15,
    minNightsSummer: 3,
    minNightsWinter: 5,
    features: [
      "Bergblick",
      "Kompakte Küche",
      "Gemütlicher Wohnbereich",
      "Terrasse",
      "Skiraum",
      "Parkplatz",
    ],
    highlights: [
      "50 m² Wohnfläche",
      "Bis zu 4 Personen",
      "Gemütlich & warm",
      "Südterrasse ebenerdig",
    ],
    amenities: [
      {
        category: "Wohnen",
        items: [
          "Wohn-/Essbereich",
          "Sitzecke",
          "Flachbild-TV",
          "WLAN",
          "Holzboden",
        ],
      },
      {
        category: "Küche",
        items: [
          "Küchenzeile",
          "Kühlschrank",
          "Herdplatten",
          "Kaffeemaschine",
          "Grundausstattung",
        ],
      },
      {
        category: "Schlafen",
        items: [
          "1 Schlafzimmer",
          "Ausziehcouch im Wohnbereich",
          "Bettwäsche inklusive",
        ],
      },
      {
        category: "Bad",
        items: ["Badezimmer mit Dusche", "Handtücher inklusive", "Föhn"],
      },
      {
        category: "Außen",
        items: ["Südterrasse (ebenerdig)", "Skiraum", "Parkplatz", "Grillplatz"],
      },
    ],
    images: [
      "/images/apartments/almrausch/living.jpg",
      "/images/apartments/almrausch/living2.jpg",
      "/images/apartments/almrausch/bedroom.jpg",
    ],
    available: true,
  },
  {
    id: "edelweiss",
    slug: "edelweiss",
    name: "Edelweiß",
    subtitle: "Kompaktes Apartment für Paare & Kurzurlauber",
    description:
      "Das Apartment Edelweiß bietet auf ca. 40 m² alles Wichtige für einen erholsamen Aufenthalt. Im Erdgeschoss gelegen mit ebenerdiger Südterrasse – perfekt für Paare oder Alleinreisende, die eine hochwertige Unterkunft in bester Lage suchen. Klein, aber fein – mit alpinem Charme und modernem Komfort.",
    shortDescription:
      "40 m² für Genießer – kompakt, hochwertig und perfekt für Paare.",
    size: 40,
    maxGuests: 4,
    baseGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: "Erdgeschoss",
    basePrice: 90,
    summerPrice: 90,
    winterPrice: 90,
    extraPersonPrice: 20,
    cleaningFee: 50,
    dogFee: 15,
    minNightsSummer: 3,
    minNightsWinter: 5,
    features: [
      "Bergblick",
      "Kompakte Küche",
      "Gemütlicher Wohnbereich",
      "Südterrasse",
      "Skiraum",
      "Parkplatz",
    ],
    highlights: [
      "40 m² Wohnfläche",
      "Bis zu 4 Personen",
      "Klein & fein",
      "Südterrasse ebenerdig",
    ],
    amenities: [
      {
        category: "Wohnen",
        items: [
          "Wohn-/Essbereich",
          "Sitzecke",
          "Flachbild-TV",
          "WLAN",
          "Holzboden",
        ],
      },
      {
        category: "Küche",
        items: [
          "Küchenzeile",
          "Kühlschrank",
          "Herdplatten",
          "Kaffeemaschine",
          "Grundausstattung",
        ],
      },
      {
        category: "Schlafen",
        items: [
          "1 Schlafzimmer",
          "Ausziehcouch im Wohnbereich",
          "Bettwäsche inklusive",
        ],
      },
      {
        category: "Bad",
        items: ["Badezimmer mit Dusche", "Handtücher inklusive", "Föhn"],
      },
      {
        category: "Außen",
        items: ["Südterrasse (ebenerdig)", "Skiraum", "Parkplatz", "Grillplatz"],
      },
    ],
    images: [
      "/images/apartments/edelweiss/living.jpg",
      "/images/apartments/edelweiss/bedroom.jpg",
    ],
    available: true,
  },
];

export function getApartmentBySlug(slug: string): Apartment | undefined {
  return apartments.find((a) => a.slug === slug);
}

export function getApartmentById(id: string): Apartment | undefined {
  return apartments.find((a) => a.id === id);
}
