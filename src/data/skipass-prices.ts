export interface SkipassPrice {
  label: string;
  duration: string;
  price: string;
}

export const skipassData = {
  season: "2025/26",
  lastUpdated: "2025-12-01",
  source: "https://www.ggresort.at/",
  prices: [
    { label: "Erwachsene", duration: "Tageskarte", price: "€ 62,50" },
    { label: "Jugend (16–18 J.)", duration: "Tageskarte", price: "€ 56,00" },
    { label: "Kinder (6–15 J.)", duration: "Tageskarte", price: "€ 31,50" },
    { label: "Erwachsene", duration: "6-Tages-Pass", price: "€ 313,00" },
    { label: "Kinder (6–15 J.)", duration: "6-Tages-Pass", price: "€ 157,00" },
  ] as SkipassPrice[],
};
