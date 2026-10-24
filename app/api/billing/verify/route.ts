import { cookies } from "next/headers";
import { recordSignupSubscription } from "@/lib/billing/signups-db";
import { retrieveCheckoutSession, stripeEnabled, subscriptionCookieOptions, SUBSCRIPTION_COOKIE, summarize } from "@/lib/billing/stripe";

/** Vérifie auprès de Stripe qu'une session Checkout a abouti (jamais sur la seule parole du navigateur). */
export async function GET(req: Request) {
  if (!stripeEnabled()) return Response.json({ error: "Stripe non configuré" }, { status: 409 });
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return Response.json({ error: "Session invalide" }, { status: 400 });
  try {
    const session = await retrieveCheckoutSession(id);
    const sub = typeof session.subscription === "object" ? session.subscription : null;
    if (session.status !== "complete" || !sub || (sub.status !== "active" && sub.status !== "trialing")) {
      return Response.json({ paid: false }, { status: 402 });
    }
    (await cookies()).set(SUBSCRIPTION_COOKIE, sub.id, subscriptionCookieOptions);
    const summary = summarize(sub);
    const signupId = Number(session.metadata?.signup_id);
    if (signupId) await recordSignupSubscription(signupId, { plan: summary.plan, status: sub.status, subscriptionId: sub.id, customerId: (session as { customer?: string | null }).customer });
    return Response.json({ paid: true, ...summary });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
