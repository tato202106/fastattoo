import { linkSubscription } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";
import { hasPaidAccess, PAYMENT_PATH } from "@/lib/billing/access";
import { isPlanId } from "@/lib/billing/plans";
import { createCheckoutSession, customerId, findLiveSubscriptionForAccount, stripeEnabled } from "@/lib/billing/stripe";

/**
 * Paiement de l'abonnement d'un tatoueur connecté : crée une session Stripe
 * Checkout (page de paiement hébergée par Stripe) et renvoie son URL.
 * L'abonnement est toujours rattaché au compte connecté (jamais à un autre).
 */
export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ mode: "demo" }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { plan?: unknown } | null;
  if (!body || !isPlanId(body.plan)) return Response.json({ error: "Forfait invalide" }, { status: 400 });

  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi à ton espace tatoueur pour payer ton abonnement." }, { status: 401 });
  if (hasPaidAccess(account.subscriptionStatus)) return Response.json({ already: true, redirect: "/espace-tatoueur" });

  try {
    // Déjà payé mais pas encore rattaché (confirmation interrompue) : on rattache au lieu de refaire payer.
    const existing = await findLiveSubscriptionForAccount(account.id).catch(() => null);
    if (existing) {
      await linkSubscription({ accountId: account.id }, { subscriptionId: existing.id, customerId: customerId(existing), status: existing.status });
      return Response.json({ already: true, redirect: "/espace-tatoueur?bienvenue=1" });
    }
    const signupId = account.signupId ?? undefined;
    const session = await createCheckoutSession({
      plan: body.plan,
      email: account.email,
      signupId,
      accountId: account.id,
      reference: `account-${account.id}`,
      origin: new URL(req.url).origin,
      successPath: "/devenir-tatoueur/inscription/confirmation",
      cancelPath: `${PAYMENT_PATH}?annule=1`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
