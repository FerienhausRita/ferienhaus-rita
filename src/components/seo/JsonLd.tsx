import { Apartment } from "@/data/apartments";
import { contact } from "@/data/contact";

const BASE_URL = "https://www.ferienhaus-rita.at";

interface JsonLdProps {
  type: "organization" | "vacationRental";
  apartment?: Apartment;
}

export default function JsonLd({ type, apartment }: JsonLdProps) {
  let data: Record<string, unknown>;

  if (type === "organization") {
    data = {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: contact.businessName,
      description:
        "Vier liebevoll eingerichtete Ferienwohnungen in Kals am Großglockner mit alpinem Charme und modernem Komfort.",
      url: BASE_URL,
      telephone: contact.phone,
      email: contact.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.street,
        postalCode: contact.zip,
        addressLocality: contact.city,
        addressRegion: contact.region,
        addressCountry: "AT",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 47.0014,
        longitude: 12.6428,
      },
      starRating: {
        "@type": "Rating",
        ratingValue: "4",
      },
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "WLAN", value: true },
        { "@type": "LocationFeatureSpecification", name: "Parkplatz", value: true },
        { "@type": "LocationFeatureSpecification", name: "Hundefreundlich", value: true },
        { "@type": "LocationFeatureSpecification", name: "Skiraum", value: true },
      ],
    };
  } else {
    data = {
      "@context": "https://schema.org",
      "@type": "VacationRental",
      name: `${apartment!.name} – ${contact.businessName}`,
      description: apartment!.shortDescription,
      url: `${BASE_URL}/wohnungen/${apartment!.slug}`,
      numberOfRooms: apartment!.bedrooms,
      numberOfBathroomsTotal: apartment!.bathrooms,
      floorSize: {
        "@type": "QuantitativeValue",
        value: apartment!.size,
        unitCode: "MTK",
      },
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: apartment!.maxGuests,
      },
      amenityFeature: apartment!.features.map((f) => ({
        "@type": "LocationFeatureSpecification",
        name: f,
        value: true,
      })),
      containedInPlace: {
        "@type": "LodgingBusiness",
        name: contact.businessName,
        address: {
          "@type": "PostalAddress",
          streetAddress: contact.street,
          postalCode: contact.zip,
          addressLocality: contact.city,
          addressCountry: "AT",
        },
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
