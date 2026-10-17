import { cookies } from "next/headers";
import { isPlanId } from "@/lib/billing/plans";
import { periodEnd, retrieveCheckoutSession, stripeEnabled, SUBSCRIPTION_COOKIE } from "@/lib/billing/stripe";

/** Vérifie auprès de Stripe qu'une session Checkout est bien payée (jamais sur la seule parole du client). */
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
    const plan = session.metadata?.plan;
    (await cookies()).set(SUBSCRIPTION_COOKIE, sub.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
    const end = periodEnd(sub);
    return Response.json({ paid: true, plan: isPlanId(plan) ? plan : "monthly", renewsAt: end ? new Date(end * 1000).toISOString().slice(0, 10) : null });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
