import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fastattoo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/pro", "/messages", "/profil", "/connexion", "/notifications", "/mon-abonnement"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
