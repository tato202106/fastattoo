import "server-only";
import { CURRENCY, PLANS, type PlanId } from "./plans";

/**
 * Client Stripe minimal (API REST, sans dépendance).
 * Le paiement se fait sur Stripe Checkout (page hébergée par Stripe) : aucune
 * donnée de carte ne transite par nos serveurs.
 */
const API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function encode(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  return body.toString();
}

async function stripe<T>(method: "GET" | "POST", path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe non configuré");
  const res = await fetch(`${API}${path}${method === "GET" && params ? `?${encode(params)}` : ""}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "POST" && params ? encode(params) : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

/** Prix configuré dans Stripe (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL) ou défini à la volée. */
function priceParams(plan: PlanId, prefix: string): Record<string, string | number> {
  const priceId = plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (priceId) return { [`${prefix}[price]`]: priceId };
  const p = PLANS[plan];
  return {
    [`${prefix}[price_data][currency]`]: CURRENCY,
    [`${prefix}[price_data][unit_amount]`]: p.amount,
    [`${prefix}[price_data][recurring][interval]`]: p.interval,
    [`${prefix}[price_data][product_data][name]`]: `Fastattoo Pro — ${p.name}`,
  };
}

export async function createCheckoutSession(opts: {
  plan: PlanId;
  email?: string;
  reference: string;
  signupId?: number;
  accountId?: number;
  origin: string;
  successPath: string;
  cancelPath: string;
}) {
  return stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    locale: "fr",
    ...priceParams(opts.plan, "line_items[0]"),
    "line_items[0][quantity]": 1,
    customer_email: opts.email || undefined,
    client_reference_id: opts.reference,
    "metadata[plan]": opts.plan,
    "metadata[signup_id]": opts.signupId,
    "metadata[account_id]": opts.accountId,
    "subscription_data[metadata][plan]": opts.plan,
    "subscription_data[metadata][signup_id]": opts.signupId,
    "subscription_data[metadata][account_id]": opts.accountId,
    allow_promotion_codes: "true",
    success_url: `${opts.origin}${opts.successPath}${opts.successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}${opts.cancelPath}`,
  });
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer?: string | { id: string } | null;
  current_period_end?: number;
  trial_end?: number | null;
  cancel_at_period_end?: boolean;
  items: { data: { id: string; current_period_end?: number; price: { id: string; product: string; recurring?: { interval: string } } }[] };
  metadata?: Record<string, string>;
}

export async function retrieveCheckoutSession(id: string) {
  return stripe<{ id: string; status: string; payment_status: string; subscription: string | StripeSubscription | null; metadata?: Record<string, string> }>(
    "GET",
    `/checkout/sessions/${encodeURIComponent(id)}`,
    { "expand[]": "subscription" },
  );
}

/**
 * Abonnement en cours (actif, à l'essai ou en retard de paiement) déjà créé pour
 * ce compte : évite un second paiement si le rattachement n'a pas encore eu lieu
 * (navigateur fermé avant la confirmation, webhook en retard…).
 */
export async function findLiveSubscriptionForAccount(accountId: number): Promise<StripeSubscription | null> {
  const res = await stripe<{ data: StripeSubscription[] }>("GET", "/subscriptions/search", {
    query: `metadata['account_id']:'${accountId}'`,
    limit: 10,
  });
  return res.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ?? null;
}

export async function retrieveSubscription(id: string) {
  return stripe<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

/** Passage au forfait annuel : remplace l'article de l'abonnement, facture le prorata tout de suite. */
export async function upgradeToAnnual(subscriptionId: string) {
  const sub = await retrieveSubscription(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error("Abonnement sans article");
  const priceId = process.env.STRIPE_PRICE_ANNUAL;
  const price: Record<string, string | number> = priceId
    ? { "items[0][price]": priceId }
    : {
        "items[0][price_data][currency]": CURRENCY,
        "items[0][price_data][unit_amount]": PLANS.annual.amount,
        "items[0][price_data][recurring][interval]": "year",
        "items[0][price_data][product]": item.price.product,
      };
  return stripe<StripeSubscription>("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    "items[0][id]": item.id,
    ...price,
    proration_behavior: "always_invoice",
    "metadata[plan]": "annual",
  });
}

/** Portail client Stripe : changer de carte, voir les factures, résilier. */
export async function createPortalSession(customerId: string, returnUrl: string) {
  return stripe<{ id: string; url: string }>("POST", "/billing_portal/sessions", { customer: customerId, return_url: returnUrl, locale: "fr" });
}

export function customerId(sub: StripeSubscription): string | null {
  return typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);
}

export function periodEnd(sub: StripeSubscription): number | undefined {
  return sub.current_period_end ?? sub.items.data[0]?.current_period_end;
}

const isoDay = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : null);

/** Résumé d'un abonnement Stripe pour l'interface. */
export function summarize(sub: StripeSubscription) {
  const interval = sub.items.data[0]?.price.recurring?.interval;
  return {
    plan: (interval === "year" ? "annual" : "monthly") as PlanId,
    status: sub.status,
    renewsAt: isoDay(periodEnd(sub)),
    trialEndsAt: sub.status === "trialing" ? isoDay(sub.trial_end) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };
}

export const subscriptionCookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 400 };

/** Cookie httpOnly qui relie le navigateur à son abonnement Stripe (pas d'identifiant manipulable côté client). */
export const SUBSCRIPTION_COOKIE = "ft_sub";
