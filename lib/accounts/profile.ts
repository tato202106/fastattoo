import { avatarAsset, artAsset } from "../art/assets";
import { STYLES } from "../styles";
import { slugify } from "../text";
import type { StyleSlug } from "../types";

/**
 * Profil d'un compte tatoueur (logique pure, testée) : validation du
 * formulaire de l'espace tatoueur et conversion en ligne de la table `artists`
 * au moment de la publication.
 */

export const ARTIST_TITLES = ["Tatoueur", "Tatoueuse", "Artiste tatoueur·se"] as const;
export type ArtistTitle = (typeof ARTIST_TITLES)[number];

/** Statut du profil : brouillon → envoyé pour validation → publié sur le site. */
export type ProfileStatus = "draft" | "submitted" | "published";

export interface ProfileInput {
  name: string;
  title: ArtistTitle;
  studio: string;
  address: string;
  city: string;
  styles: StyleSlug[];
  priceFrom: number | null;
  hourlyRate: number | null;
  bio: string;
  instagram: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;
export type ProfileResult = { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors };

const STYLE_SLUGS = new Set<string>(STYLES.map((s) => s.slug));

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function euros(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(text(v, 10).replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n) : null;
}

export function cleanInstagram(v: unknown): string {
  return text(v, 80)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?].*$/, "")
    .slice(0, 60);
}

/** Valide le profil envoyé depuis l'espace tatoueur. */
export function parseProfile(input: Record<string, unknown>): ProfileResult {
  const errors: ProfileErrors = {};
  const name = text(input.name, 120);
  const rawTitle = text(input.title, 40);
  const title = (ARTIST_TITLES as readonly string[]).includes(rawTitle) ? (rawTitle as ArtistTitle) : "Tatoueur";
  const studio = text(input.studio, 120);
  const address = text(input.address, 200);
  const city = text(input.city, 80);
  const styles = [...new Set((Array.isArray(input.styles) ? input.styles : []).filter((s): s is StyleSlug => typeof s === "string" && STYLE_SLUGS.has(s)))];
  const priceFrom = euros(input.priceFrom);
  const hourlyRate = euros(input.hourlyRate);
  const bio = text(input.bio, 1500);
  const instagram = cleanInstagram(input.instagram);

  if (!name) errors.name = "Indique ton nom ou ton nom d'artiste.";
  if (!city) errors.city = "Indique ta ville.";
  if (styles.length === 0) errors.styles = "Choisis au moins un style.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, title, studio, address, city, styles, priceFrom, hourlyRate, bio, instagram } };
}

/** Ce qui manque avant de pouvoir envoyer le profil pour validation. */
export function missingForSubmission(p: Partial<ProfileInput> & { lat?: number | null; lng?: number | null }): string[] {
  const missing: string[] = [];
  if (!p.name) missing.push("ton nom");
  if (!p.city || p.lat == null || p.lng == null) missing.push("ta ville (ou l'adresse de ton studio)");
  if (!p.styles?.length) missing.push("tes styles");
  if (!p.priceFrom) missing.push("ton prix de départ");
  if (!p.bio || p.bio.length < 30) missing.push("une présentation (au moins 30 caractères)");
  return missing;
}

/** Identifiant de la ligne `artists` d'un compte (stable : republier met à jour la même ligne). */
export function artistIdFor(accountId: number): string {
  return `acc-${accountId}`;
}

/** Slug d'URL du profil : « nom-ville », suffixé par l'identifiant du compte pour rester unique. */
export function artistSlugFor(accountId: number, name: string, city: string): string {
  const base = slugify(`${name} ${city}`).slice(0, 60).replace(/-+$/, "") || "tatoueur";
  return `${base}-${accountId}`;
}

export interface PublishableAccount {
  id: number;
  name: string;
  title: string;
  studio: string;
  address: string;
  city: string;
  styles: StyleSlug[];
  priceFrom: number | null;
  hourlyRate: number | null;
  bio: string;
  instagram: string;
  lat: number;
  lng: number;
}

/** Ligne de la table `artists` (colonnes de scripts/seed-neon.ts) pour un compte validé. */
export function toArtistRow(a: PublishableAccount) {
  const priceFrom = a.priceFrom ?? 0;
  return {
    id: artistIdFor(a.id),
    slug: artistSlugFor(a.id, a.name, a.city),
    name: a.name,
    title: a.title || "Tatoueur",
    city: a.city,
    city_slug: slugify(a.city),
    studio: a.studio,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    styles: a.styles,
    price_from: priceFrom,
    // Sans tarif horaire indiqué, on reprend le prix de départ (champ obligatoire de la table).
    hourly_rate: a.hourlyRate ?? priceFrom,
    bio: a.bio,
    // Pas encore de photos : avatar aux initiales et couverture générée dans son premier style.
    avatar: avatarAsset(10000 + a.id, a.name),
    cover: artAsset(a.styles[0] ?? "fine-line", 10000 + a.id, `Univers de ${a.name}`),
    instagram: a.instagram || null,
  };
}
