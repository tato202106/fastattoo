import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fastattoo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/pro", "/messages", "/profil", "/connexion", "/notifications"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
