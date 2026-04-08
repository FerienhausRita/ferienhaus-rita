import Container from "@/components/ui/Container";

const testimonials = [
  {
    text: "Ein wunderbarer Ort zum Entspannen. Die Wohnung war top ausgestattet und der Blick auf die Berge einfach atemberaubend. Wir kommen definitiv wieder!",
    author: "Familie Müller",
    origin: "München",
    rating: 5,
  },
  {
    text: "Perfekter Ausgangspunkt zum Skifahren. Die Pisten sind nur wenige Minuten entfernt und die Wohnung ist nach einem langen Tag auf der Piste ein echtes Zuhause.",
    author: "Thomas & Sarah",
    origin: "Wien",
    rating: 5,
  },
  {
    text: "Unsere Hunde waren herzlich willkommen und die Wanderwege direkt vor der Tür waren fantastisch. Rita ist eine großartige Gastgeberin mit tollen Tipps.",
    author: "Andrea K.",
    origin: "Hamburg",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-[var(--color-gold)]" : "text-stone-200"}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialSection() {
  return (
    <section className="py-24 sm:py-32 bg-stone-50">
      <Container>
        <div className="text-center mb-16 sm:mb-20">
          <span className="text-[var(--color-gold)] text-xs tracking-[0.3em] uppercase font-medium">
            Bewertungen
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mt-4 tracking-tight">
            Was unsere Gäste sagen
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100"
            >
              <StarRating rating={testimonial.rating} />
              <p className="mt-6 text-stone-600 leading-relaxed text-sm italic">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <div className="mt-6 pt-4 border-t border-stone-100">
                <p className="font-semibold text-stone-900 text-sm">
                  {testimonial.author}
                </p>
                <p className="text-stone-400 text-xs mt-0.5">
                  {testimonial.origin}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
