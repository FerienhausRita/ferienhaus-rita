import Container from "@/components/ui/Container";

const highlights = [
  {
    title: "Direkte Pistenanbindung",
    text: "Nur wenige Gehminuten zum Skigebiet GG Resort Kals-Matrei. Nach einem Tag auf der Piste sind Sie in kürzester Zeit zurück in Ihrer warmen Wohnung.",
    icon: (
      <svg className="w-8 h-8 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L8 10l-6 1 4 4.5L5 22l7-3.5L19 22l-1-6.5 4-4.5-6-1L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 22l5-7M22 22l-5-7" />
      </svg>
    ),
  },
  {
    title: "Hunde herzlich willkommen",
    text: "Ihr Vierbeiner ist bei uns ein gern gesehener Gast. Die Wanderwege direkt vor der Tür bieten Auslauf und Abenteuer für die ganze Familie.",
    icon: (
      <svg className="w-8 h-8 text-[var(--color-gold)]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
  {
    title: "Persönlich & Authentisch",
    text: "Wir sind vor Ort und kümmern uns persönlich um Ihr Wohlbefinden. Insider-Tipps, ehrliche Beratung und ein offenes Ohr – das macht den Unterschied.",
    icon: (
      <svg className="w-8 h-8 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

export default function TestimonialSection() {
  return (
    <section className="py-24 sm:py-32 bg-stone-50">
      <Container>
        <div className="text-center mb-16 sm:mb-20">
          <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
            WARUM WIR
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
            Was uns besonders macht
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((highlight, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100"
            >
              <div className="mb-6">{highlight.icon}</div>
              <h3 className="font-semibold text-stone-900 text-lg mb-3">
                {highlight.title}
              </h3>
              <p className="text-stone-600 leading-relaxed text-sm">
                {highlight.text}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
