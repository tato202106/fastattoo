import { cookies } from "next/headers";
import { periodEnd, stripeEnabled, SUBSCRIPTION_COOKIE, upgradeToAnnual } from "@/lib/billing/stripe";

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
    const end = periodEnd(sub);
    return Response.json({ plan: "annual", renewsAt: end ? new Date(end * 1000).toISOString().slice(0, 10) : null });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
