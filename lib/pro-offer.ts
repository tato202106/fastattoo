/**
 * Offre d'abonnement tatoueur affichée sur /devenir-tatoueur.
 * Modifier ici les prix, l'argument de l'annuel et le lien du formulaire d'inscription.
 */
export const PRO_PRICE_MONTHLY = 19;
/** Forfait annuel (mis en avant à l'inscription et proposé aux abonnés mensuels). */
export const PRO_PRICE_ANNUAL = 179;
/**
 * Argument mis en avant sur le forfait annuel (pas de période d'essai : le
 * paiement est immédiat) : l'économie réelle par rapport à 12 mois au mensuel,
 * calculée à partir des prix (12 × 19 € − 179 € = 49 €), vérifiée par les tests.
 */
export const PRO_ANNUAL_PERK = `${PRO_PRICE_MONTHLY * 12 - PRO_PRICE_ANNUAL} € d'économie`;


/**
 * Lien du formulaire d'inscription (formulaire du site, ou un lien externe).
 * Tant qu'il est vide, le bouton affiche « Inscriptions bientôt ouvertes ».
 */
export const PRO_SIGNUP_URL = "/devenir-tatoueur/inscription";

/**
 * Lien d'inscription avec le forfait choisi sur /devenir-tatoueur : il est
 * présélectionné à l'étape de paiement. Un lien externe est renvoyé tel quel.
 */
export function proSignupUrlFor(plan: "annual" | "monthly"): string {
  if (!PRO_SIGNUP_URL.startsWith("/")) return PRO_SIGNUP_URL;
  return `${PRO_SIGNUP_URL}?forfait=${plan}`;
}
