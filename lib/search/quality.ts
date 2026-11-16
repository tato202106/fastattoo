/**
 * Classement par la qualité, jamais par le prix (logique pure, testée).
 *
 * - Score de qualité : moyenne bayésienne de la note. Un tatoueur avec peu
 *   d'avis est tiré vers une note de référence : un 5★ sur 2 avis ne passe pas
 *   devant un 4,8★ sur 60 avis. Un nouveau tatoueur (0 avis) part de la note de
 *   référence : il n'est ni enterré ni favorisé.
 * - Note basse confirmée (assez d'avis, moyenne sous le seuil) : le tatoueur
 *   passe après tous les autres, même s'il est parrain. Casser les prix ne
 *   rapporte aucune place : le prix n'entre jamais dans le classement.
 */

export const QUALITY_PRIOR = 4.5;
export const QUALITY_PRIOR_WEIGHT = 20;
export const LOW_RATING_THRESHOLD = 3.5;
export const LOW_RATING_MIN_REVIEWS = 5;

type Rated = { rating: number; reviewCount: number };

export function qualityScore(a: Rated): number {
  const n = Math.max(0, a.reviewCount);
  return (a.rating * n + QUALITY_PRIOR * QUALITY_PRIOR_WEIGHT) / (n + QUALITY_PRIOR_WEIGHT);
}

/** Note basse confirmée par assez d'avis clients. */
export function isLowRated(a: Rated): boolean {
  return a.reviewCount >= LOW_RATING_MIN_REVIEWS && a.rating < LOW_RATING_THRESHOLD;
}
