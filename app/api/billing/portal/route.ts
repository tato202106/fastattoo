import { cookies } from "next/headers";
import { createPortalSession, customerId, retrieveSubscription, stripeEnabled, SUBSCRIPTION_COOKIE } from "@/lib/billing/stripe";

/**
 * Ouvre le portail client Stripe pour l'abonnement relié à ce navigateur
 * (cookie httpOnly posé après un paiement vérifié) : carte, factures, résiliation.
 */
export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ mode: "demo" }, { status: 409 });
  const subId = (await cookies()).get(SUBSCRIPTION_COOKIE)?.value;
  if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) return Response.json({ error: "Aucun abonnement associé à cet appareil" }, { status: 404 });
  try {
    const customer = customerId(await retrieveSubscription(subId));
    if (!customer) return Response.json({ error: "Client Stripe introuvable" }, { status: 404 });
    const session = await createPortalSession(customer, `${new URL(req.url).origin}/mon-abonnement`);
    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
