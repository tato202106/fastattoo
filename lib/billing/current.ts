import "server-only";
import { cookies } from "next/headers";
import { currentAccount } from "../accounts/session";
import { SUBSCRIPTION_COOKIE } from "./stripe";

const SUB_ID = /^sub_[A-Za-z0-9]+$/;

/**
 * Abonnement Stripe de la personne : celui du compte tatoueur connecté, sinon
 * celui relié à ce navigateur après un paiement (cookie httpOnly).
 */
export async function currentSubscriptionId(): Promise<string | null> {
  const account = await currentAccount();
  if (account?.subscriptionId && SUB_ID.test(account.subscriptionId)) return account.subscriptionId;
  const fromCookie = (await cookies()).get(SUBSCRIPTION_COOKIE)?.value;
  return fromCookie && SUB_ID.test(fromCookie) ? fromCookie : null;
}
