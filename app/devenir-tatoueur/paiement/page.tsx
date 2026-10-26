import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentPage } from "@/components/billing/PaymentPage";
import { linkSubscription } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";
import { hasPaidAccess, needsPaymentFix } from "@/lib/billing/access";
import { isPlanId } from "@/lib/billing/plans";
import { customerId, findLiveSubscriptionForAccount, stripeEnabled } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Paiement de l'abonnement", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Paiement obligatoire du tatoueur : fin de l'inscription, et page vers
 * laquelle le proxy renvoie tant que l'abonnement n'est pas actif.
 */
export default async function ArtistPaymentPage({ searchParams }: PageProps<"/devenir-tatoueur/paiement">) {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  if (hasPaidAccess(account.subscriptionStatus)) redirect("/espace-tatoueur");

  const stripe = stripeEnabled();
  // Paiement déjà fait mais pas encore rattaché (confirmation interrompue) : on rattache au lieu de refaire payer.
  if (stripe && !account.subscriptionId) {
    const existing = await findLiveSubscriptionForAccount(account.id).catch(() => null);
    if (existing) {
      await linkSubscription({ accountId: account.id }, { subscriptionId: existing.id, customerId: customerId(existing), status: existing.status }).catch(() => {});
      redirect("/espace-tatoueur?bienvenue=1");
    }
  }

  const params = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe lg:pt-8">
      <PaymentPage
        name={account.name}
        fromSignup={params.inscription === "1"}
        cancelled={params.annule === "1"}
        fixPayment={Boolean(account.subscriptionId && needsPaymentFix(account.subscriptionStatus))}
        stripe={stripe}
        initialPlan={isPlanId(params.forfait) ? params.forfait : "annual"}
      />
    </main>
  );
}
