/**
 * Adresse publique du site (sitemap, robots, aperçus de liens).
 * NEXT_PUBLIC_SITE_URL si elle est définie (ton domaine), sinon le domaine de
 * production que Vercel fournit automatiquement, sinon le serveur local.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
