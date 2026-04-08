import { Metadata } from "next";
import Container from "@/components/ui/Container";
import ContactForm from "@/components/ui/ContactForm";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktieren Sie uns – Ferienhaus Rita in Kals am Großglockner. Wir freuen uns auf Ihre Nachricht.",
};

export default function KontaktPage() {
  return (
    <div className="pt-28 pb-24">
      <Container>
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
            Kontakt
          </h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Haben Sie Fragen oder möchten Sie mehr über unsere Wohnungen
            erfahren? Wir freuen uns auf Ihre Nachricht.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-4">
                So erreichen Sie uns
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-alpine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">E-Mail</p>
                    <a
                      href={contact.emailHref}
                      className="text-sm text-alpine-600 hover:text-alpine-700"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-alpine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">Telefon</p>
                    <a
                      href={contact.phoneHref}
                      className="text-sm text-alpine-600 hover:text-alpine-700"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-alpine-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-alpine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">Adresse</p>
                    <p className="text-sm text-stone-500">
                      {contact.street}
                      <br />
                      {contact.zip} {contact.city}
                      <br />
                      {contact.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-alpine-50 rounded-2xl p-6">
              <h4 className="font-semibold text-stone-800 mb-2 text-sm">
                Antwortzeit
              </h4>
              <p className="text-stone-500 text-sm">
                Wir antworten in der Regel innerhalb weniger Stunden. Bei
                dringenden Anliegen erreichen Sie uns am besten telefonisch.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </Container>
    </div>
  );
}
