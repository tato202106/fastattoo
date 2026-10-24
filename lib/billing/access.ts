/**
 * Accès des tatoueurs au site selon leur abonnement (logique pure, testée).
 *
 * Un tatoueur connecté sans abonnement valide est renvoyé vers la page de
 * paiement, quelle que soit la page demandée (voir proxy.ts).
 */

/** Page de paiement : fin de l'inscription, et passage obligé tant que l'abonnement n'est pas actif. */
export const PAYMENT_PATH = "/devenir-tatoueur/paiement";

/**
 * Statuts Stripe qui donnent accès :
 * - active : abonnement payé ; trialing : anciens abonnements créés pendant
 *   l'offre d'essai (supprimée), carte enregistrée ;
 * - past_due : un renouvellement a échoué et Stripe relance le paiement — on
 *   laisse quelques jours de grâce, avec un message pour mettre la carte à jour.
 */
const ACCESS = new Set(["active", "trialing", "past_due"]);

/** Abonnement existant à régulariser (carte refusée) plutôt qu'à reprendre de zéro. */
const FIX_WITH_PORTAL = new Set(["unpaid", "incomplete", "past_due"]);

export function hasPaidAccess(status: string | null | undefined): boolean {
  return !!status && ACCESS.has(status);
}

export function needsPaymentFix(status: string | null | undefined): boolean {
  return !!status && FIX_WITH_PORTAL.has(status);
}

/** Pages toujours accessibles à un tatoueur connecté qui n'a pas encore payé. */
const EXEMPT_PREFIXES = [
  PAYMENT_PATH,
  "/devenir-tatoueur/inscription/confirmation",
  "/espace-tatoueur/connexion",
  "/espace-tatoueur/mot-de-passe-oublie",
  "/espace-tatoueur/nouveau-mot-de-passe",
  "/offline",
];

export function isPaymentExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type GateDecision = "allow" | "pay";

/**
 * Décision du proxy pour une page demandée.
 * `status` : undefined = pas de compte connecté (visiteur), null = compte sans abonnement.
 */
export function gateDecision(opts: { enabled: boolean; pathname: string; status: string | null | undefined }): GateDecision {
  if (!opts.enabled || opts.status === undefined) return "allow";
  if (isPaymentExempt(opts.pathname)) return "allow";
  return hasPaidAccess(opts.status) ? "allow" : "pay";
}
