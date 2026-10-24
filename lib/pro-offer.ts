/**
 * Offre d'abonnement tatoueur affichée sur /devenir-tatoueur.
 * Modifier ici les prix, l'argument de l'annuel et le lien du formulaire d'inscription.
 */
export const PRO_PRICE_MONTHLY = 19;
/** Forfait annuel (mis en avant à l'inscription et proposé aux abonnés mensuels). */
export const PRO_PRICE_ANNUAL = 179;
/**
 * Argument mis en avant sur le forfait annuel (pas de période d'essai : le
 * paiement est immédiat). Vrai tant que l'annuel coûte moins que 11 mois au
 * mensuel (179 € < 11 × 19 € = 209 €), vérifié par les tests.
 */
export const PRO_ANNUAL_PERK = "1 mois offert";

/**
 * Lien du formulaire d'inscription (formulaire du site, ou un lien externe).
 * Tant qu'il est vide, le bouton affiche « Inscriptions bientôt ouvertes ».
 */
export const PRO_SIGNUP_URL = "/devenir-tatoueur/inscription";
