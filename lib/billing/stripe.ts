import "server-only";
import { stripeConfigured, stripePlanRef, stripeSecretKey } from "./env";
import { CURRENCY, PLANS, type PlanId } from "./plans";

/**
 * Client Stripe minimal (API REST, sans dépendance).
 * Le paiement se fait sur Stripe Checkout (page hébergée par Stripe) : aucune
 * donnée de carte ne transite par nos serveurs.
 */
const API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return stripeConfigured();
}

function encode(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  return body.toString();
}

async function stripe<T>(method: "GET" | "POST", path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const key = stripeSecretKey();
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

interface StripePrice {
  id: string;
  active: boolean;
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string } | null;
}

type PlanRef = { kind: "price" | "product"; id: string; auto?: boolean };

// Prix retrouvés dans le compte Stripe (évite une requête à chaque paiement).
const DISCOVERY_TTL_MS = 10 * 60_000;
const discovered = new Map<PlanId, { at: number; id: string | null }>();

/**
 * Prix déjà créé dans Stripe pour ce forfait (même montant, même devise, même
 * périodicité), quand aucune variable STRIPE_PRICE_… ne l'indique.
 */
async function discoverPrice(plan: PlanId): Promise<string | null> {
  const cached = discovered.get(plan);
  if (cached && Date.now() - cached.at < (cached.id ? DISCOVERY_TTL_MS : 60_000)) return cached.id;
  const p = PLANS[plan];
  let id: string | null = null;
  try {
    const res = await stripe<{ data: StripePrice[] }>("GET", "/prices", { active: "true", type: "recurring", currency: CURRENCY, limit: 100 });
    id = res.data.find((x) => x.unit_amount === p.amount && x.currency === CURRENCY && x.recurring?.interval === p.interval)?.id ?? null;
  } catch (e) {
    // Clé restreinte sans lecture des prix, par exemple : prix défini à la volée.
    console.warn(`[stripe] recherche du prix ${plan} impossible :`, (e as Error).message);
  }
  discovered.set(plan, { at: Date.now(), id });
  return id;
}

/**
 * Prix ou produit Stripe d'un forfait : variable d'environnement, sinon prix
 * retrouvé dans le compte. `ignoreEnv` : la variable désigne un prix inconnu
 * de ce compte Stripe (prix du mode test avec une clé live, par exemple).
 */
export async function resolvePlanRef(plan: PlanId, ignoreEnv = false): Promise<PlanRef | null> {
  const ref = ignoreEnv ? null : stripePlanRef(plan);
  if (ref) return ref;
  const id = await discoverPrice(plan);
  return id ? { kind: "price", id, auto: true } : null;
}

/**
 * Prix d'un forfait : prix Stripe (price_…), produit Stripe (prod_…, montant
 * repris de lib/pro-offer.ts) ou, à défaut, prix défini à la volée.
 */
async function priceParams(plan: PlanId, prefix: string, ignoreEnv = false): Promise<Record<string, string | number>> {
  const ref = await resolvePlanRef(plan, ignoreEnv);
  const p = PLANS[plan];
  if (ref?.kind === "price") return { [`${prefix}[price]`]: ref.id };
  if (ref?.kind === "product") {
    return {
      [`${prefix}[price_data][currency]`]: CURRENCY,
      [`${prefix}[price_data][unit_amount]`]: p.amount,
      [`${prefix}[price_data][recurring][interval]`]: p.interval,
      [`${prefix}[price_data][product]`]: ref.id,
    };
  }
  return {
    [`${prefix}[price_data][currency]`]: CURRENCY,
    [`${prefix}[price_data][unit_amount]`]: p.amount,
    [`${prefix}[price_data][recurring][interval]`]: p.interval,
    [`${prefix}[price_data][product_data][name]`]: `Fastattoo Pro — ${p.name}`,
  };
}

const isMissingResource = (e: unknown) => /no such (price|product)/i.test((e as Error).message);

/**
 * Réessaie sans le prix de la variable d'environnement quand Stripe ne le
 * connaît pas : le paiement passe quand même (prix retrouvé ou défini à la volée).
 */
async function withPlanFallback<T>(plan: PlanId, run: (ignoreEnv: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(false);
  } catch (e) {
    if (!stripePlanRef(plan) || !isMissingResource(e)) throw e;
    console.warn(`[stripe] prix ${plan} de la variable d'environnement introuvable (${(e as Error).message}) : prix de secours utilisé.`);
    return run(true);
  }
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
  return withPlanFallback(opts.plan, async (ignoreEnv) =>
    stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      locale: "fr",
      ...(await priceParams(opts.plan, "line_items[0]", ignoreEnv)),
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
    }),
  );
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
  return withPlanFallback("annual", async (ignoreEnv) => {
    const ref = await resolvePlanRef("annual", ignoreEnv);
    const price: Record<string, string | number> =
      ref?.kind === "price"
        ? { "items[0][price]": ref.id }
        : {
            "items[0][price_data][currency]": CURRENCY,
            "items[0][price_data][unit_amount]": PLANS.annual.amount,
            "items[0][price_data][recurring][interval]": "year",
            "items[0][price_data][product]": ref?.kind === "product" ? ref.id : item.price.product,
          };
    return stripe<StripeSubscription>("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      "items[0][id]": item.id,
      ...price,
      proration_behavior: "always_invoice",
      "metadata[plan]": "annual",
    });
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

export interface StripeSetupCheck {
  keyWorks: boolean;
  keyError: string | null;
  plans: Record<PlanId, { found: boolean; auto: boolean; detail: string | null; matches: boolean | null; error: string | null }>;
}

/**
 * Vérifie en direct la configuration Stripe (page /admin) : la clé fonctionne,
 * les prix/produits existent et correspondent aux montants affichés sur le site.
 */
export async function checkStripeSetup(): Promise<StripeSetupCheck> {
  const result: StripeSetupCheck = {
    keyWorks: false,
    keyError: null,
    plans: {
      monthly: { found: false, auto: false, detail: null, matches: null, error: null },
      annual: { found: false, auto: false, detail: null, matches: null, error: null },
    },
  };
  try {
    await stripe("GET", "/prices", { limit: 1 });
    result.keyWorks = true;
  } catch (e) {
    result.keyError = (e as Error).message;
    return result;
  }
  for (const plan of ["monthly", "annual"] as PlanId[]) {
    const ref = await resolvePlanRef(plan);
    if (!ref) continue;
    try {
      if (ref.kind === "price") {
        const price = await stripe<StripePrice>("GET", `/prices/${encodeURIComponent(ref.id)}`);
        const p = PLANS[plan];
        result.plans[plan] = {
          found: true,
          auto: Boolean(ref.auto),
          detail: `${(price.unit_amount ?? 0) / 100} ${price.currency.toUpperCase()} / ${price.recurring?.interval ?? "paiement unique"}${price.active ? "" : " (inactif)"}`,
          matches: price.active && price.unit_amount === p.amount && price.currency === CURRENCY && price.recurring?.interval === p.interval,
          error: null,
        };
      } else {
        const product = await stripe<{ active: boolean; name: string }>("GET", `/products/${encodeURIComponent(ref.id)}`);
        result.plans[plan] = { found: true, auto: false, detail: `Produit « ${product.name} »${product.active ? "" : " (inactif)"}`, matches: product.active, error: null };
      }
    } catch (e) {
      const message = (e as Error).message;
      const error = isMissingResource(e) && !ref.auto
        ? `${message} : cet identifiant n'existe pas pour cette clé (prix créé en mode test avec une clé live ?). Le site utilise en attendant un prix de secours au bon montant ; remplace la variable par le price_… du mode live.`
        : message;
      result.plans[plan] = { found: false, auto: Boolean(ref.auto), detail: null, matches: false, error };
    }
  }
  return result;
}
