import { cookies } from "next/headers";
import { linkSubscription } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";
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
    const customerId = (session as { customer?: string | null }).customer ?? null;
    if (signupId) await recordSignupSubscription(signupId, { plan: summary.plan, status: sub.status, subscriptionId: sub.id, customerId });
    // Rattache l'abonnement au compte qui a payé (identifiant posé par le serveur dans la session Stripe).
    const account = await currentAccount();
    const paidAccountId = Number(session.metadata?.account_id) || null;
    const ownAccount = Boolean(account && ((paidAccountId && account.id === paidAccountId) || (signupId && account.signupId === signupId)));
    try {
      if (paidAccountId) await linkSubscription({ accountId: paidAccountId }, { subscriptionId: sub.id, customerId, status: sub.status });
      else if (signupId) await linkSubscription({ signupId }, { subscriptionId: sub.id, customerId, status: sub.status });
    } catch (e) {
      console.error("[abonnement] rattachement au compte impossible :", e);
    }
    return Response.json({ paid: true, account: ownAccount, ...summary });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
