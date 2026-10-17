import { cookies } from "next/headers";
import { recordSignupSubscription } from "@/lib/billing/signups-db";
import { stripeEnabled, SUBSCRIPTION_COOKIE, summarize, upgradeToAnnual } from "@/lib/billing/stripe";

/**
 * Passage au forfait annuel de l'abonnement du navigateur (cookie httpOnly posé
 * après un paiement vérifié). ⚠️ À rattacher à un vrai compte authentifié en production.
 */
export async function POST() {
  if (!stripeEnabled()) return Response.json({ mode: "demo" }, { status: 409 });
  const subId = (await cookies()).get(SUBSCRIPTION_COOKIE)?.value;
  if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) return Response.json({ error: "Aucun abonnement associé à cet appareil" }, { status: 404 });
  try {
    const sub = await upgradeToAnnual(subId);
    const summary = summarize(sub);
    const signupId = Number(sub.metadata?.signup_id);
    if (signupId) await recordSignupSubscription(signupId, { plan: "annual", status: sub.status, subscriptionId: sub.id });
    return Response.json({ ...summary, plan: "annual" });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
