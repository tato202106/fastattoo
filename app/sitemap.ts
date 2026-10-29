import type { MetadataRoute } from "next";
import { artists } from "@/lib/data";
import { isDemoArtist } from "@/lib/showcase";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fastattoo.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await artists.allSlugs();
  // Les profils d'exemple sont en noindex : on ne les met pas dans le sitemap.
  const profiles = await Promise.all(slugs.map((slug) => artists.getBySlug(slug)));
  const realSlugs = profiles
    .filter((a): a is NonNullable<typeof a> => a !== null && !isDemoArtist(a))
    .map((a) => a.slug);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explorer`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/devenir-tatoueur`, changeFrequency: "monthly", priority: 0.7 },
    ...realSlugs.map((slug) => ({ url: `${SITE_URL}/tatoueurs/${slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
