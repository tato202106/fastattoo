/**
 * Offre d'abonnement tatoueur affichée sur /devenir-tatoueur.
 * Modifier ici le prix, l'offre de lancement et le lien du formulaire d'inscription.
 */
export const PRO_PRICE_MONTHLY = 19;
/** Forfait annuel (mis en avant à l'inscription et proposé aux abonnés mensuels). */
export const PRO_PRICE_ANNUAL = 179;
/** Offre de lancement : mois offerts avant le premier prélèvement (période d'essai Stripe). 0 = paiement immédiat. */
export const PRO_FREE_MONTHS = 1;

/** « 1 mois offert » / « 3 mois offerts » (accord automatique). */
export const PRO_FREE_LABEL = `${PRO_FREE_MONTHS} mois offert${PRO_FREE_MONTHS > 1 ? "s" : ""}`;

/**
 * Lien du formulaire d'inscription (formulaire du site, ou un lien externe).
 * Tant qu'il est vide, le bouton affiche « Inscriptions bientôt ouvertes ».
 */
export const PRO_SIGNUP_URL = "/devenir-tatoueur/inscription";
