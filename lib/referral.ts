import { todayISO } from "./dates";

/**
 * Parrainage tatoueurs.
 * Un tatoueur qui parraine un nouvel abonné obtient le badge « Parrain » et une
 * mise en avant dans la recherche pendant SPONSOR_BOOST_MONTHS mois.
 * La date de fin est stockée dans Neon (colonne artists.sponsor_until).
 */
export const SPONSOR_BOOST_MONTHS = 1;

/** Vrai tant que la mise en avant « Parrain » n'est pas expirée. */
export function isSponsorActive(sponsorUntil: string | null | undefined, today = todayISO()): boolean {
  return !!sponsorUntil && sponsorUntil >= today;
}

/** Normalise une valeur de date venant de la base (Date ou chaîne) en AAAA-MM-JJ. */
export function toISODate(v: unknown): string | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return undefined;
}

/** Lien d'inscription pré-rempli avec le parrain (nom, @Instagram ou identifiant de profil). */
export function referralPath(sponsor: string): string {
  return `/devenir-tatoueur/inscription?parrain=${encodeURIComponent(sponsor.trim())}`;
}
