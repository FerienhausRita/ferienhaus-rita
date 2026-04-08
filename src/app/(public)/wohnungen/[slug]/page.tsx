import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { apartments, getApartmentBySlug } from "@/data/apartments";
import { formatCurrency } from "@/lib/pricing";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import ImageGallery from "@/components/ui/ImageGallery";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return apartments.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const apartment = getApartmentBySlug(params.slug);
  if (!apartment) return { title: "Nicht gefunden" };
  return {
    title: apartment.name,
    description: apartment.shortDescription,
  };
}

export default function ApartmentDetailPage({ params }: Props) {
  const apartment = getApartmentBySlug(params.slug);
  if (!apartment) notFound();

  return (
    <>
    <JsonLd type="vacationRental" apartment={apartment} />
    <div className="pt-24 pb-24">
      {/* Hero Gallery */}
      <div className="mb-12">
        <Container>
          <div className="mb-4">
            <Link
              href="/wohnungen"
              className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Alle Wohnungen
            </Link>
          </div>
          <ImageGallery
            images={apartment.images.map((src, i) => ({
              src,
              alt: `${apartment.name} – Bild ${i + 1}`,
            }))}
            layout="hero"
          />
        </Container>
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
                {apartment.name}
              </h1>
              <p className="text-lg text-stone-500">{apartment.subtitle}</p>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Fläche", value: `${apartment.size} m²` },
                { label: "Gäste", value: `bis ${apartment.maxGuests}` },
                { label: "Schlafzimmer", value: `${apartment.bedrooms}` },
                { label: "Stockwerk", value: apartment.floor },
              ].map((fact) => (
                <div
                  key={fact.label}
                  className="bg-stone-50 rounded-xl p-4 text-center"
                >
                  <p className="text-sm text-stone-500">{fact.label}</p>
                  <p className="text-lg font-semibold text-stone-900 mt-1">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-12">
              <p className="text-stone-600 leading-relaxed text-base">
                {apartment.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-stone-900 mb-6">
                Ausstattung
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {apartment.amenities.map((group) => (
                  <div
                    key={group.category}
                    className="bg-stone-50 rounded-xl p-6"
                  >
                    <h3 className="font-semibold text-stone-800 mb-3">
                      {group.category}
                    </h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm text-stone-600"
                        >
                          <svg
                            className="w-4 h-4 text-alpine-500 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white rounded-2xl border border-stone-200 shadow-lg p-6">
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-stone-900">
                    {formatCurrency(apartment.basePrice)}
                  </span>
                  <span className="text-stone-500">/ Nacht</span>
                </div>
                <p className="text-sm text-stone-400 mt-1">
                  Grundpreis bis {apartment.baseGuests} Personen
                </p>
              </div>

              <div className="space-y-3 mb-6 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>Weitere Person</span>
                  <span className="font-medium">
                    +{formatCurrency(apartment.extraPersonPrice)} / Nacht
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Endreinigung</span>
                  <span className="font-medium">
                    {formatCurrency(apartment.cleaningFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hund</span>
                  <span className="font-medium">
                    +{formatCurrency(apartment.dogFee)} / Nacht
                  </span>
                </div>
              </div>

              <Link
                href={`/buchen?apartment=${apartment.slug}`}
                className="block w-full text-center bg-alpine-600 hover:bg-alpine-700 text-white py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg"
              >
                Jetzt buchen
              </Link>

              <Link
                href="/kontakt"
                className="block w-full text-center text-stone-600 hover:text-stone-800 mt-3 py-2 text-sm font-medium transition-colors"
              >
                Frage stellen
              </Link>

              <div className="mt-6 pt-6 border-t border-stone-100 space-y-2">
                {apartment.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-sm text-stone-500"
                  >
                    <svg
                      className="w-4 h-4 text-alpine-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
    </>
  );
}
