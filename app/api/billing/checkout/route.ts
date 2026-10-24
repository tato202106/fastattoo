import { isPlanId, TRIAL_DAYS } from "@/lib/billing/plans";
import { createCheckoutSession, stripeEnabled } from "@/lib/billing/stripe";

/**
 * Paiement de l'inscription d'un tatoueur : crée une session Stripe Checkout
 * (page de paiement hébergée par Stripe) et renvoie son URL.
 */
export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ mode: "demo" }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { plan?: unknown; email?: unknown; signupId?: unknown } | null;
  if (!body || !isPlanId(body.plan)) return Response.json({ error: "Forfait invalide" }, { status: 400 });
  const email = typeof body.email === "string" && /\S+@\S+\.\S+/.test(body.email) ? body.email.slice(0, 200) : undefined;
  const signupId = typeof body.signupId === "number" && Number.isInteger(body.signupId) && body.signupId > 0 ? body.signupId : undefined;
  try {
    const session = await createCheckoutSession({
      plan: body.plan,
      email,
      signupId,
      reference: signupId ? `signup-${signupId}` : "signup",
      origin: new URL(req.url).origin,
      successPath: "/devenir-tatoueur/inscription/confirmation",
      cancelPath: "/devenir-tatoueur/inscription?paiement=annule",
      trialDays: TRIAL_DAYS,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
