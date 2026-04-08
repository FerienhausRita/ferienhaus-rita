import Link from "next/link";
import Image from "next/image";

const activities = [
  {
    season: "Winter",
    items: [
      "GG Resort Kals-Matrei",
      "Langlaufloipen",
      "Winterwandern",
      "Rodelbahn",
      "Skitouren",
    ],
  },
  {
    season: "Sommer",
    items: [
      "Wandern im Nationalpark",
      "Großglockner Hochalpenstraße",
      "Klettersteige",
      "Mountainbiken",
      "Baden im Bergsee",
    ],
  },
];

export default function RegionPreview() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/region/grossglockner-glacier.jpg"
          alt="Großglockner mit Pasterze-Gletscher"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[var(--color-gold)] text-xs font-medium tracking-[0.3em] uppercase">
              Die Region
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-4 mb-8 tracking-tight leading-[1.05]">
              Kals am
              <br />
              Großglockner
            </h2>
            <div className="w-12 h-px bg-[var(--color-gold)]/60 mb-8" />
            <p className="text-white/70 text-lg leading-relaxed mb-10 font-light max-w-lg">
              Am Fuße des höchsten Berges Österreichs erwartet Sie ein
              Naturparadies für jede Jahreszeit. Das idyllische Bergdorf liegt
              im Herzen des Nationalparks Hohe Tauern.
            </p>
            <Link
              href="/region"
              className="inline-flex items-center gap-3 text-[var(--color-gold)] text-xs font-semibold tracking-wider uppercase group"
            >
              Region entdecken
              <svg
                className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activities.map((group) => (
              <div
                key={group.season}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-sm p-8"
              >
                <h3 className="text-[var(--color-gold)] text-xs font-semibold tracking-[0.2em] uppercase mb-6">
                  {group.season}
                </h3>
                <ul className="space-y-4">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-white/80 text-sm"
                    >
                      <div className="w-1 h-1 rounded-full bg-[var(--color-gold)]/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
