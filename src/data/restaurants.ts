export interface Restaurant {
  name: string;
  slug: string;
  description: string;
  cuisine: string;
  location: string;
  altitude?: string;
  image: string;
  website?: string;
  features?: string[];
}

export const restaurants: Restaurant[] = [
  {
    name: "Adlerlounge",
    slug: "adlerlounge",
    description:
      "Panorama-Restaurant auf dem Cimaross mit 360°-Blick über mehr als 60 Dreitausender. Gehobene Küche auf 2.621 Metern – erreichbar mit der Gondel.",
    cuisine: "Gehobene Alpenküche",
    location: "Cimaross, GG Resort",
    altitude: "2.621 m",
    image: "/images/region/huette-adlerlounge.jpg",
    website: "https://www.adlerlounge.at/",
    features: ["Panoramaterrasse", "Gondelzugang", "Sonnenterrasse"],
  },
  {
    name: "Lucknerhaus",
    slug: "lucknerhaus",
    description:
      "Traditionsreiche Jausenstation am Beginn des Ködnitztals. Idealer Ausgangspunkt für Wanderungen zur Lucknerhütte und Stüdlhütte. Deftige Tiroler Kost in uriger Atmosphäre.",
    cuisine: "Tiroler Küche",
    location: "Ködnitztal",
    altitude: "1.920 m",
    image: "/images/region/huette-lucknerhaus.jpeg",
    features: ["Großer Parkplatz", "Ausgangspunkt Wanderungen", "Spielplatz"],
  },
  {
    name: "Glocknerblick",
    slug: "glocknerblick",
    description:
      "Gemütliche Almhütte mit herrlichem Blick auf den Großglockner. Tiroler Spezialitäten und hausgemachte Kuchen. Im Winter direkt an der Rodelbahn Lesach.",
    cuisine: "Tiroler Spezialitäten",
    location: "Lesachtal",
    altitude: "1.650 m",
    image: "/images/region/huette-glocknerblick.jpg",
    features: ["Rodelbahn", "Sonnenterrasse", "Hausgemachte Kuchen"],
  },
  {
    name: "Gamsalm",
    slug: "gamsalm",
    description:
      "Beliebtes Ausflugslokal in Kals mit regionaler Küche und gemütlicher Atmosphäre. Bekannt für Wild- und Almspezialitäten.",
    cuisine: "Regionale Küche",
    location: "Kals am Großglockner",
    image: "/images/region/gamsalm.png",
    features: ["Wildspezialitäten", "Familienfreundlich"],
  },
  {
    name: "Temblerhof",
    slug: "temblerhof",
    description:
      "Uriger Gasthof mit langer Tradition in Kals. Serviert bodenständige Tiroler Gerichte mit Produkten aus der Region.",
    cuisine: "Tiroler Küche",
    location: "Kals am Großglockner",
    image: "/images/region/temblerhof.jpg",
    features: ["Traditionsgasthof", "Regionale Produkte"],
  },
  {
    name: "Ködnitzhof",
    slug: "koednitzhof",
    description:
      "Gastfreundlicher Hof am Eingang zum Ködnitztal. Rustikale Küche mit Schwerpunkt auf lokale und saisonale Zutaten.",
    cuisine: "Rustikale Küche",
    location: "Ködnitz, Kals",
    image: "/images/region/koednitzhof.jpg",
    features: ["Saisonale Küche", "Ruhige Lage"],
  },
  {
    name: "Gradonna Mountain Resort",
    slug: "gradonna",
    description:
      "Stilvolles Restaurant im Gradonna Resort mit Blick auf die Bergwelt. Kreative alpenländische Küche auf gehobenem Niveau mit Spa- und Wellnessbereich.",
    cuisine: "Gehobene Alpenküche",
    location: "Kals am Großglockner",
    image: "/images/region/gradonna.jpg",
    website: "https://www.gradonna.at/",
    features: ["Wellnessbereich", "Gehobene Küche", "Panoramablick"],
  },
];
