import Image from "next/image";
import BookingWidget from "@/components/booking/BookingWidget";
import ScrollDownIndicator from "@/components/ui/ScrollDownIndicator";

export default function Hero() {
  return (
    <section data-hero className="relative h-[100svh] md:h-screen min-h-[500px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Ken Burns */}
      <div className="absolute inset-0">
        <div className="ken-burns absolute inset-0">
          <Image
            src="/images/hero/hero.jpg"
            alt="Ferienhaus Rita in Kals am Großglockner mit Bergpanorama"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 md:pt-32 pb-10 md:pb-20">
        {/* Decorative line */}
        <div className="flex justify-center mb-8">
          <div className="hero-line h-px bg-[var(--color-gold)]/60" />
        </div>

        {/* Subtitle */}
        <div className="hero-reveal-1 mb-4">
          <span className="inline-block text-[var(--color-gold)] text-xs sm:text-sm font-medium tracking-[0.4em] uppercase">
            Kals am Großglockner · Osttirol
          </span>
        </div>

        {/* Main heading */}
        <h1 className="hero-reveal-2 font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-[0.95] tracking-tight">
          Ihr Zuhause
          <br />
          <span className="text-gradient-gold">in den Alpen</span>
        </h1>

        {/* Description */}
        <p className="hero-reveal-3 text-base sm:text-lg text-white/60 max-w-xl mx-auto mb-8 md:mb-16 leading-relaxed font-light">
          Vier liebevoll eingerichtete Ferienwohnungen am Fuße des Großglockners.
          Alpiner Charme, moderne Ausstattung und unvergessliche Bergpanoramen.
        </p>

        {/* Booking Widget – hidden on mobile, shown below fold instead */}
        <div className="hero-reveal-4 max-w-4xl mx-auto hidden md:block">
          <BookingWidget />
        </div>

        {/* Trust Indicators */}
        <div className="hero-reveal-4 mt-8 md:mt-16 hidden md:flex flex-wrap items-center justify-center gap-10 text-white/40 text-xs tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)]" />
            Direkt buchen
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)]" />
            Pistennähe
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-[var(--color-gold)]" />
            Hunde willkommen
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <ScrollDownIndicator />
    </section>
  );
}
