import { styleLabel } from "./styles";
import type { StyleSlug } from "./types";

/**
 * Profils d'exemple.
 *
 * Tant que les tatoueurs affichés sont des profils de démonstration (données
 * de `lib/data/seed.ts`), on le dit clairement : badge « Profil exemple »,
 * pas de notes, d'avis, de badge « Vérifié » ni de disponibilités, qui
 * laisseraient croire à de vrais tatoueurs.
 *
 * Passer à `false` quand le site n'affiche plus que de vrais tatoueurs inscrits.
 */
export const DEMO_PROFILES = true;

export const DEMO_BADGE_LABEL = "Profil exemple";

/** Identifiant des tatoueurs inscrits (comptes réels, voir lib/accounts/profile.ts). */
const REAL_ARTIST_PREFIX = "acc-";

/** Profil d'exemple ? Les vrais tatoueurs inscrits ne sont jamais présentés comme exemples. */
export function isDemoArtist(a: { id: string }): boolean {
  return DEMO_PROFILES && !a.id.startsWith(REAL_ARTIST_PREFIX);
}

/** Nouveau tatoueur, sans avis pour l'instant : pas de note « 0 » affichée. */
export function isNewArtist(a: { reviewCount: number }): boolean {
  return a.reviewCount === 0;
}

/** Prix de départ : « dès 80 € », ou « sur devis » s'il n'est pas renseigné. */
export function priceFromLabel(priceFrom: number): string {
  return priceFrom > 0 ? `dès ${priceFrom} €` : "sur devis";
}

/**
 * Étiquette d'une épingle de la carte : la note des clients, jamais le prix
 * (on choisit un tatoueur pour la qualité de son travail). Nouveau tatoueur :
 * « Nouveau » ; profil d'exemple : son style, sans fausse note.
 */
export function mapPinLabel(a: { id: string; rating: number; reviewCount: number; styles: StyleSlug[] }): string {
  if (isDemoArtist(a)) return a.styles[0] ? styleLabel(a.styles[0]) : DEMO_BADGE_LABEL;
  if (isNewArtist(a)) return "Nouveau";
  return `★ ${a.rating.toFixed(1).replace(".", ",")}`;
}
