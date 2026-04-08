import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/seo/JsonLd";
import CookieConsent from "@/components/ui/CookieConsent";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
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
    siteName: "Ferienhaus Rita",
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
        <a href="#main-content" className="skip-nav">
          Zum Inhalt springen
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
        <CookieConsent />
        <JsonLd type="organization" />
      </body>
    </html>
  );
}
