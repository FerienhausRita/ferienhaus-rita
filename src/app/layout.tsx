import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ferienhaus-rita-kals.at"),
  title: {
    default: "Ferienhaus Rita – Urlaub in Kals am Großglockner",
    template: "%s | Ferienhaus Rita",
  },
  description:
    "Ski-in / Ski-out: Vier Ferienwohnungen direkt an der Piste in Kals am Großglockner. Alpiner Charme, moderne Ausstattung und Bergpanorama. Jetzt direkt buchen.",
  keywords: [
    "Ferienhaus",
    "Kals am Großglockner",
    "Ferienwohnung",
    "Osttirol",
    "Ski-in Ski-out",
    "Skiurlaub",
    "direkt an der Piste",
    "Wanderurlaub",
    "Alpen",
    "Österreich",
  ],
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: "https://www.ferienhaus-rita-kals.at",
    siteName: "Ferienhaus Rita",
    images: [
      {
        url: "/images/hero/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Ferienhaus Rita – Ferienwohnungen in Kals am Großglockner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
