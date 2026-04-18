"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { label: "Wohnungen", href: "/wohnungen" },
  { label: "Preise", href: "/preise" },
  { label: "Region", href: "/region" },
  { label: "Über uns", href: "/ueber-uns" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
];

export default function Header() {
  const pathname = usePathname();
  const hasHero = pathname === "/" || pathname === "/region" || pathname === "/ueber-uns" || pathname?.startsWith("/wohnungen/");
  const [isScrolled, setIsScrolled] = useState(!hasHero);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasHero) {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasHero]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-stone-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex flex-col">
              <span
                className={`text-lg font-semibold tracking-tight transition-colors duration-500 ${
                  isScrolled ? "text-stone-900" : "text-white"
                }`}
              >
                Ferienhaus Rita
              </span>
              <span
                className={`text-[10px] tracking-[0.25em] uppercase transition-colors duration-500 ${
                  isScrolled ? "text-stone-400" : "text-white/40"
                }`}
              >
                Kals am Großglockner
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs font-medium tracking-wider uppercase transition-colors duration-300 ${
                  pathname === item.href
                    ? "text-[var(--color-gold)]"
                    : isScrolled
                    ? "text-stone-500 hover:text-stone-900"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/buchen"
              className="text-xs font-semibold tracking-wider uppercase text-white bg-[var(--color-gold)] hover:bg-[var(--color-gold-light)] px-6 py-2.5 transition-all duration-300"
            >
              Buchen
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 transition-colors ${
              isScrolled
                ? "text-stone-500 hover:text-stone-900"
                : "text-white/70 hover:text-white"
            }`}
            aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-stone-100"
        >
          <div className="px-4 py-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-medium tracking-wider uppercase transition-colors ${
                  pathname === item.href
                    ? "text-[var(--color-gold)]"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4">
              <Link
                href="/buchen"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center bg-[var(--color-gold)] text-white px-6 py-3.5 text-sm font-semibold tracking-wider uppercase transition-colors"
              >
                Jetzt buchen
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
