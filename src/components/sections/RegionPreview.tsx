import Image from "next/image";
import Link from "next/link";

export default function RegionPreview() {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 h-[100vh] md:h-[70vh]">
        {/* Winter */}
        <Link
          href="/region/winter"
          className="relative h-[50vh] md:h-full flex items-center justify-center overflow-hidden group"
        >
          <Image
            src="/images/region/winter-split.jpg"
            alt="Winter in Kals – Skifahren und Schneelandschaft"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 transition-all duration-500" />
          <div className="relative z-10 text-center px-8">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Dezember – April
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mt-3 tracking-tight">
              Winter
            </h2>
            <p className="text-white/70 mt-3 text-lg font-light max-w-sm mx-auto">
              Skifahren, Rodeln, Langlaufen und die Stille verschneiter Berge.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-medium tracking-wider uppercase group-hover:bg-white/20 transition-all">
              Winter entdecken
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
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
            </div>
          </div>
        </Link>

        {/* Sommer */}
        <Link
          href="/region/sommer"
          className="relative h-[50vh] md:h-full flex items-center justify-center overflow-hidden group"
        >
          <Image
            src="/images/region/summer-split.jpg"
            alt="Sommer in Kals – Wandern und grüne Almlandschaften"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 group-hover:from-black/60 group-hover:via-black/30 transition-all duration-500" />
          <div className="relative z-10 text-center px-8">
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Mai – Oktober
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mt-3 tracking-tight">
              Sommer
            </h2>
            <p className="text-white/70 mt-3 text-lg font-light max-w-sm mx-auto">
              Wandern, Klettern, Biken und die majestätische Bergwelt erleben.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-medium tracking-wider uppercase group-hover:bg-white/20 transition-all">
              Sommer entdecken
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
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
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
