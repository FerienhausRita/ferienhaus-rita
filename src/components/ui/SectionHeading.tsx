interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  centered = true,
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${centered ? "text-center" : ""}`}>
      <h2
        className={`font-serif text-3xl sm:text-4xl font-bold tracking-tight ${
          light ? "text-white" : "text-stone-900"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-lg max-w-2xl ${centered ? "mx-auto" : ""} ${
            light ? "text-white/80" : "text-stone-500"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
