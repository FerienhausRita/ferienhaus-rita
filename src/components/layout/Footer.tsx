import Link from "next/link";
import { contact } from "@/data/contact";

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-white text-lg font-semibold mb-2">
              {contact.businessName}
            </h3>
            <p className="text-stone-400 text-sm mb-4">
              {contact.city}
              <br />
              {contact.region}, {contact.country}
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              Ihr Zuhause in den Alpen – vier liebevoll eingerichtete Wohnungen
              mit Blick auf Österreichs höchsten Berg.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Unterkunft
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/wohnungen"
                  className="text-sm hover:text-white transition-colors"
                >
                  Unsere Wohnungen
                </Link>
              </li>
              <li>
                <Link
                  href="/buchen"
                  className="text-sm hover:text-white transition-colors"
                >
                  Verfügbarkeit & Buchen
                </Link>
              </li>
              <li>
                <Link
                  href="/region"
                  className="text-sm hover:text-white transition-colors"
                >
                  Region & Aktivitäten
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm hover:text-white transition-colors"
                >
                  Häufige Fragen
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Kontakt
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={contact.phoneHref}
                  className="hover:text-white transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={contact.emailHref}
                  className="hover:text-white transition-colors"
                >
                  {contact.email}
                </a>
              </li>
              <li className="text-stone-400">
                {contact.street}
                <br />
                {contact.zip} {contact.city}
                <br />
                {contact.country}
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Rechtliches
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/impressum"
                  className="text-sm hover:text-white transition-colors"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  href="/datenschutz"
                  className="text-sm hover:text-white transition-colors"
                >
                  Datenschutzerklärung
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-stone-500 text-sm">
            © {new Date().getFullYear()} {contact.businessName}. Alle Rechte
            vorbehalten.
          </p>
          <p className="text-stone-600 text-xs">
            Mit Liebe gemacht in {contact.city}
          </p>
        </div>
      </div>
    </footer>
  );
}
