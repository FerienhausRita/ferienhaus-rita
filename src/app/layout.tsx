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
  title: {
    default: "Ferienhaus Rita – Urlaub in Kals am Großglockner",
    template: "%s | Ferienhaus Rita",
  },
  description:
    "Vier liebevoll eingerichtete Ferienwohnungen in Kals am Großglockner. Alpiner Charme, moderne Ausstattung und atemberaubende Bergpanoramen. Jetzt direkt buchen.",
  keywords: [
    "Ferienhaus",
    "Kals am Großglockner",
    "Ferienwohnung",
    "Osttirol",
    "Skiurlaub",
    "Wanderurlaub",
    "Alpen",
    "Österreich",
  ],
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: "https://www.ferienhaus-rita-kals.at",
    siteName: "Ferienhaus Rita",
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
