import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/gaestemappe", "/admin", "/meine-buchung", "/reinigung"],
    },
    sitemap: "https://www.ferienhaus-rita-kals.at/sitemap.xml",
  };
}
