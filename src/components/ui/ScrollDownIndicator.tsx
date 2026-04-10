"use client";

export default function ScrollDownIndicator() {
  const handleClick = () => {
    const hero = document.querySelector("[data-hero]");
    if (hero) {
      const nextSection = hero.nextElementSibling;
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Nach unten scrollen"
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group"
    >
      <span className="text-white/70 text-[10px] tracking-[0.3em] uppercase group-hover:text-white transition-colors">
        Entdecken
      </span>
      <svg
        className="w-5 h-5 text-white/70 animate-bounce group-hover:text-white transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </button>
  );
}
