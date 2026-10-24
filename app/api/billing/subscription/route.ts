import { currentSubscriptionId } from "@/lib/billing/current";
import { retrieveSubscription, stripeEnabled, summarize } from "@/lib/billing/stripe";

/** Abonnement Stripe du compte connecté, ou relié à ce navigateur (cookie httpOnly posé après un paiement vérifié). */
export async function GET() {
  if (!stripeEnabled()) return Response.json({ subscription: null, mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
  const subId = await currentSubscriptionId();
  if (!subId) return Response.json({ subscription: null, mode: "stripe" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const sub = await retrieveSubscription(subId);
    return Response.json({ subscription: summarize(sub), mode: "stripe" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
