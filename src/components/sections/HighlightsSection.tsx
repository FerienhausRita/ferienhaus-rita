export default function HighlightsSection() {
  const highlights = [
    {
      number: "4",
      label: "Wohnungen",
      detail: "40–96 m² für 2–6 Personen",
    },
    {
      number: "96",
      label: "m² größte Suite",
      detail: "Großzügig & komfortabel",
    },
    {
      number: "300+",
      label: "km Wanderwege",
      detail: "Nationalpark Hohe Tauern",
    },
    {
      number: "3.798",
      label: "Meter Großglockner",
      detail: "Österreichs höchster Berg",
    },
  ];

  const features = [
    "Ski-in / Ski-out",
    "Hunde willkommen",
    "Bestpreis-Garantie",
    "Voll ausgestattete Küchen",
    "Kostenloser Parkplatz",
    "Persönlicher Service",
  ];

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden bg-stone-50">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
            Auf einen Blick
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
            Warum Ferienhaus Rita?
          </h2>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-20">
          {highlights.map((item) => (
            <div key={item.label} className="text-center">
              <div className="font-serif text-5xl sm:text-6xl font-bold text-gradient-gold mb-2">
                {item.number}
              </div>
              <div className="text-stone-700 text-sm font-medium tracking-wide uppercase mb-1">
                {item.label}
              </div>
              <div className="text-stone-400 text-xs">{item.detail}</div>
            </div>
          ))}
        </div>

        {/* Features line */}
        <div className="border-t border-stone-200 pt-12">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-stone-500 text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
