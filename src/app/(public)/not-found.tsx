import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white pt-32 pb-16 px-4">
      <div className="text-center">
        <p className="tracking-[0.3em] uppercase text-xs text-[var(--color-gold)] mb-4">
          Seite nicht gefunden
        </p>
        <h1 className="font-serif text-8xl font-bold text-stone-900 mb-4">
          404
        </h1>
        <p className="text-stone-500 mb-10 text-lg">
          Diese Seite existiert leider nicht.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block bg-alpine-600 hover:bg-alpine-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Zur Startseite
          </Link>
          <Link
            href="/kontakt"
            className="inline-block border border-stone-300 hover:border-stone-400 text-stone-700 px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Kontakt
          </Link>
        </div>
      </div>
    </div>
  );
}
