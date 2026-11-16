import "server-only";
import sharp from "sharp";
import type { Account } from "./accounts/db";
import { listPhotos } from "./accounts/db";
import { artistSlugFor } from "./accounts/profile";
import { artists } from "./data";
import { type ShareChannel, profileShareUrl, shareTexts } from "./share-kit";
import { siteUrl } from "./site-url";
import { storage } from "./storage";
import { styleLabel } from "./styles";

/** Tout ce qu'il faut pour le kit de partage d'un tatoueur connecté. */
export async function shareKitFor(account: Account) {
  const slug = artistSlugFor(account.id, account.name, account.city);
  const base = siteUrl();
  const channels: ShareChannel[] = ["qr", "story", "bio", "lien"];
  const links = Object.fromEntries(channels.map((c) => [c, profileShareUrl(base, slug, c)])) as Record<ShareChannel, string>;
  const styles = account.styles.map(styleLabel);
  return {
    slug,
    profileUrl: `${base}/tatoueurs/${slug}`,
    links,
    styles,
    texts: shareTexts({ name: account.name, studio: account.studio, city: account.city, styles }, links),
  };
}

/** Note publique du profil (null s'il n'a pas encore d'avis). */
export async function publicRating(slug: string): Promise<{ rating: number; count: number } | null> {
  const artist = await artists.getBySlug(slug).catch(() => null);
  if (!artist || !artist.reviewCount) return null;
  return { rating: artist.rating, count: artist.reviewCount };
}

/** Première photo du portfolio en JPEG (data URL) pour le visuel de story, ou null. */
export async function coverPhotoDataUrl(accountId: number, width = 1080, height = 1080): Promise<string | null> {
  try {
    const photos = await listPhotos(accountId);
    const id = photos[0]?.base.match(/^\/media\/u\/([a-z0-9]{16,40})$/)?.[1];
    if (!id) return null;
    const original = await storage().get(`${id}/source`);
    if (!original) return null;
    const jpeg = await sharp(original).rotate().resize({ width, height, fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (e) {
    console.error("[kit] photo de couverture impossible :", e);
    return null;
  }
}
