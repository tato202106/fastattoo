import { currentSubscriptionId } from "@/lib/billing/current";
import { stripeEnabled } from "@/lib/billing/stripe";

/**
 * Mode de paiement : « stripe » si une clé est configurée, sinon « demo ».
 * `hasSubscription` : ce navigateur est relié à un vrai abonnement Stripe.
 */
export async function GET() {
  const has = Boolean(await currentSubscriptionId());
  return Response.json({ mode: stripeEnabled() ? "stripe" : "demo", hasSubscription: stripeEnabled() && has }, { headers: { "Cache-Control": "no-store" } });
}
