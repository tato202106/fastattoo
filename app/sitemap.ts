import type { MetadataRoute } from "next";
import { artists } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";

const SITE_URL = siteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await artists.allSlugs();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explorer`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/devenir-tatoueur`, changeFrequency: "monthly", priority: 0.7 },
    ...slugs.map((slug) => ({ url: `${SITE_URL}/tatoueurs/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
