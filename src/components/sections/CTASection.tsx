import Link from "next/link";
import Container from "@/components/ui/Container";

export default function CTASection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <Container narrow>
        <div className="text-center bg-gradient-to-br from-stone-50 to-amber-50/30 rounded-3xl p-12 sm:p-16 border border-stone-100">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-4 tracking-tight">
            Bereit für Ihren Alpinurlaub?
          </h2>
          <p className="text-stone-500 text-lg mb-10 max-w-lg mx-auto font-light">
            Sichern Sie sich jetzt Ihre Wunschwohnung und freuen Sie sich auf
            unvergessliche Tage in Kals am Großglockner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/buchen"
              className="bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Verfügbarkeit prüfen
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="/kontakt"
              className="bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-8 py-4 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all inline-flex items-center justify-center"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
