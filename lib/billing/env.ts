/**
 * Lecture des variables d'environnement Stripe (sans « server-only » : utilisé
 * aussi par proxy.ts). Accepte les noms les plus courants pour éviter qu'une
 * clé bien configurée sous un autre nom laisse le paiement désactivé.
 * Ne renvoie jamais la valeur d'une clé à l'interface : seulement des diagnostics.
 */
import type { PlanId } from "./plans";

const SECRET_NAMES = ["STRIPE_SECRET_KEY", "STRIPE_API_KEY", "STRIPE_SECRET", "STRIPE_KEY", "STRIPE_SK", "STRIPE_PRIVATE_KEY"];
const PRICE_NAMES: Record<PlanId, string[]> = {
  monthly: ["STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_ID_MONTHLY", "STRIPE_MONTHLY_PRICE_ID", "STRIPE_MONTHLY_PRICE", "STRIPE_PRICE_MENSUEL", "STRIPE_PRODUCT_MONTHLY"],
  annual: [
    "STRIPE_PRICE_ANNUAL",
    "STRIPE_PRICE_YEARLY",
    "STRIPE_PRICE_ID_ANNUAL",
    "STRIPE_PRICE_ID_YEARLY",
    "STRIPE_ANNUAL_PRICE_ID",
    "STRIPE_YEARLY_PRICE_ID",
    "STRIPE_ANNUAL_PRICE",
    "STRIPE_YEARLY_PRICE",
    "STRIPE_PRICE_ANNUEL",
    "STRIPE_PRODUCT_ANNUAL",
  ],
};
const WEBHOOK_NAMES = ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SIGNING_SECRET", "STRIPE_SIGNING_SECRET", "STRIPE_ENDPOINT_SECRET"];

type Env = Record<string, string | undefined>;

function first(names: string[], env: Env): { name: string; value: string } | null {
  for (const name of names) {
    const value = env[name]?.trim().replace(/^["']|["']$/g, "");
    if (value) return { name, value };
  }
  return null;
}

/** Clé secrète Stripe utilisable (sk_… ou clé restreinte rk_…), ou null. */
export function stripeSecretKey(env: Env = process.env): string | null {
  const found = first(SECRET_NAMES, env);
  return found && /^(sk|rk)_(test|live)_/.test(found.value) ? found.value : null;
}

export function stripeConfigured(env: Env = process.env): boolean {
  return stripeSecretKey(env) !== null;
}

/** Identifiant Stripe d'un forfait : prix (price_…) ou produit (prod_…), ou null. */
export function stripePlanRef(plan: PlanId, env: Env = process.env): { kind: "price" | "product"; id: string } | null {
  const found = first(PRICE_NAMES[plan], env);
  if (!found) return null;
  if (found.value.startsWith("price_")) return { kind: "price", id: found.value };
  if (found.value.startsWith("prod_")) return { kind: "product", id: found.value };
  return null;
}

export function stripeWebhookSecret(env: Env = process.env): string | null {
  const found = first(WEBHOOK_NAMES, env);
  return found && found.value.startsWith("whsec_") ? found.value : null;
}

export interface BillingDiagnostics {
  secretKey: { ok: boolean; variable: string | null; mode: "test" | "live" | null; problem: string | null };
  prices: Record<PlanId, { variable: string | null; kind: "price" | "product" | null; problem: string | null }>;
  webhook: { ok: boolean; variable: string | null };
  database: boolean;
}

/** État de la configuration, sans jamais exposer les valeurs. */
export function billingDiagnostics(env: Env = process.env): BillingDiagnostics {
  const key = first(SECRET_NAMES, env);
  let keyProblem: string | null = null;
  if (!key) keyProblem = "Aucune clé secrète Stripe trouvée.";
  else if (/^pk_/.test(key.value)) keyProblem = `${key.name} contient la clé publique (pk_…) : il faut la clé secrète (sk_…).`;
  else if (!/^(sk|rk)_(test|live)_/.test(key.value)) keyProblem = `${key.name} ne ressemble pas à une clé secrète Stripe (sk_live_… ou sk_test_…).`;
  const prices = {} as BillingDiagnostics["prices"];
  for (const plan of ["monthly", "annual"] as PlanId[]) {
    const found = first(PRICE_NAMES[plan], env);
    const ref = stripePlanRef(plan, env);
    prices[plan] = {
      variable: found?.name ?? null,
      kind: ref?.kind ?? null,
      problem: found && !ref ? `${found.name} doit contenir un identifiant price_… (ou prod_…).` : null,
    };
  }
  const hook = first(WEBHOOK_NAMES, env);
  return {
    secretKey: { ok: !keyProblem, variable: key?.name ?? null, mode: key ? (key.value.includes("_live_") ? "live" : key.value.includes("_test_") ? "test" : null) : null, problem: keyProblem },
    prices,
    webhook: { ok: Boolean(stripeWebhookSecret(env)), variable: hook?.name ?? null },
    database: Boolean(env.DATABASE_URL),
  };
}
