/**
 * Lecture des variables d'environnement Stripe (sans « server-only » : utilisé
 * aussi par proxy.ts). Accepte les noms les plus courants pour éviter qu'une
 * clé bien configurée sous un autre nom laisse le paiement désactivé.
 * Ne renvoie jamais la valeur d'une clé à l'interface : seulement des diagnostics.
 */
import type { PlanId } from "./plans";

const SECRET_NAMES = [
  "STRIPE_SECRET_KEY",
  "STRIPE_RESTRICTED_KEY",
  "STRIPE_RESTRICTED_API_KEY",
  "STRIPE_RK",
  "STRIPE_API_KEY",
  "STRIPE_SECRET",
  "STRIPE_KEY",
  "STRIPE_SK",
  "STRIPE_PRIVATE_KEY",
  "STRIPE_LIVE_SECRET_KEY",
  "STRIPE_SECRET_KEY_LIVE",
];
const SECRET_FORMAT = /^(sk|rk)_(test|live)_/;
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

const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "") ?? "";

function first(names: string[], env: Env): { name: string; value: string } | null {
  for (const name of names) {
    const value = clean(env[name]);
    if (value) return { name, value };
  }
  return null;
}

/**
 * Variable reconnue par son nom, sinon n'importe quelle variable « STRIPE… »
 * dont la valeur a le bon format (clé live préférée à une clé test).
 */
function find(names: string[], format: RegExp, env: Env): { name: string; value: string } | null {
  const named = first(names, env);
  if (named && format.test(named.value)) return named;
  const matches = Object.keys(env)
    .filter((name) => name.toUpperCase().includes("STRIPE") && format.test(clean(env[name])))
    .sort()
    .map((name) => ({ name, value: clean(env[name]) }));
  return matches.find((m) => m.value.includes("_live_")) ?? matches[0] ?? named;
}

/** Clé secrète Stripe utilisable (sk_… ou clé restreinte rk_…), ou null. */
export function stripeSecretKey(env: Env = process.env): string | null {
  const found = find(SECRET_NAMES, SECRET_FORMAT, env);
  return found && SECRET_FORMAT.test(found.value) ? found.value : null;
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
  const found = find(WEBHOOK_NAMES, /^whsec_/, env);
  return found && found.value.startsWith("whsec_") ? found.value : null;
}

export interface BillingDiagnostics {
  secretKey: { ok: boolean; variable: string | null; mode: "test" | "live" | null; restricted: boolean; problem: string | null };
  prices: Record<PlanId, { variable: string | null; kind: "price" | "product" | null; problem: string | null }>;
  webhook: { ok: boolean; variable: string | null };
  database: boolean;
}

/** État de la configuration, sans jamais exposer les valeurs. */
export function billingDiagnostics(env: Env = process.env): BillingDiagnostics {
  const key = find(SECRET_NAMES, SECRET_FORMAT, env);
  let keyProblem: string | null = null;
  if (!key) keyProblem = "Aucune clé secrète Stripe trouvée.";
  else if (/^pk_/.test(key.value)) keyProblem = `${key.name} contient la clé publique (pk_…) : il faut la clé secrète (sk_…) ou restreinte (rk_…).`;
  else if (!SECRET_FORMAT.test(key.value)) keyProblem = `${key.name} ne ressemble pas à une clé Stripe (sk_live_… ou rk_live_…).`;
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
  const hook = find(WEBHOOK_NAMES, /^whsec_/, env);
  return {
    secretKey: { ok: !keyProblem, variable: key?.name ?? null, mode: key ? (key.value.includes("_live_") ? "live" : key.value.includes("_test_") ? "test" : null) : null,
      restricted: Boolean(key?.value.startsWith("rk_")),
      problem: keyProblem,
    },
    prices,
    webhook: { ok: Boolean(stripeWebhookSecret(env)), variable: hook?.name ?? null },
    database: Boolean(env.DATABASE_URL),
  };
}
