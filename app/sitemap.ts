import type { MetadataRoute } from "next";
import { artists } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fastattoo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await artists.allSlugs();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explorer`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/devenir-tatoueur`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cgv`, changeFrequency: "yearly", priority: 0.2 },
    ...slugs.map((slug) => ({ url: `${SITE_URL}/tatoueurs/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
