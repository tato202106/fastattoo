import { cookies } from "next/headers";
import { retrieveSubscription, stripeEnabled, SUBSCRIPTION_COOKIE, summarize } from "@/lib/billing/stripe";

/** Abonnement Stripe relié à ce navigateur (cookie httpOnly posé après un paiement vérifié). */
export async function GET() {
  if (!stripeEnabled()) return Response.json({ subscription: null, mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
  const subId = (await cookies()).get(SUBSCRIPTION_COOKIE)?.value;
  if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) return Response.json({ subscription: null, mode: "stripe" }, { headers: { "Cache-Control": "no-store" } });
  try {
    const sub = await retrieveSubscription(subId);
    return Response.json({ subscription: summarize(sub), mode: "stripe" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
