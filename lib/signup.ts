import { STYLES } from "./styles";
import type { StyleSlug } from "./types";

/** Demande d'inscription d'un tatoueur (formulaire /devenir-tatoueur/inscription). */
export interface ArtistSignup {
  name: string;
  studio: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  instagram: string;
  styles: StyleSlug[];
  priceFrom: number | null;
  message: string;
  consent: true;
}

export type SignupResult = { ok: true; value: ArtistSignup } | { ok: false; errors: Partial<Record<keyof ArtistSignup, string>> };

const STYLE_SLUGS = new Set<string>(STYLES.map((s) => s.slug));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Valide et nettoie les données envoyées par le formulaire. */
export function parseSignup(input: Record<string, unknown>): SignupResult {
  const errors: Partial<Record<keyof ArtistSignup, string>> = {};
  const name = text(input.name, 120);
  const studio = text(input.studio, 120);
  const address = text(input.address, 200);
  const city = text(input.city, 80);
  const email = text(input.email, 160).toLowerCase();
  const phone = text(input.phone, 30);
  const instagram = text(input.instagram, 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const message = text(input.message, 2000);
  const styles = (Array.isArray(input.styles) ? input.styles : []).filter((s): s is StyleSlug => typeof s === "string" && STYLE_SLUGS.has(s));
  const rawPrice = typeof input.priceFrom === "number" ? input.priceFrom : Number(text(input.priceFrom, 10).replace(",", "."));
  const priceFrom = Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice < 100000 ? Math.round(rawPrice) : null;

  if (!name) errors.name = "Indique ton nom ou ton nom d'artiste.";
  if (!city) errors.city = "Indique ta ville.";
  if (!EMAIL_RE.test(email)) errors.email = "Adresse e-mail invalide.";
  if (styles.length === 0) errors.styles = "Choisis au moins un style.";
  if (input.consent !== true) errors.consent = "Ton accord est nécessaire pour créer ton profil.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, studio, address, city, email, phone, instagram, styles: [...new Set(styles)], priceFrom, message, consent: true } };
}
