import "server-only";
import { neon } from "@neondatabase/serverless";
import type { PlanId } from "./plans";
import type { SubscriptionUpdate } from "./webhook";

/** Connexion Neon (type concret, réutilisé par les fonctions ci-dessous). */
const connect = (url: string) => neon(url);
type Sql = ReturnType<typeof connect>;

/** Colonnes d'abonnement de artist_signups (ajoutées au besoin, sans migration manuelle). */
async function ensureSubscriptionColumns(sql: Sql) {
  await sql`ALTER TABLE artist_signups
    ADD COLUMN IF NOT EXISTS plan text,
    ADD COLUMN IF NOT EXISTS subscription_status text,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS subscribed_at timestamptz,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean,
    ADD COLUMN IF NOT EXISTS current_period_end date,
    ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz`;
}

/** Enregistre l'abonnement d'une inscription tatoueur (table artist_signups, colonnes ajoutées au besoin). */
export async function recordSignupSubscription(signupId: number, data: { plan: PlanId; status: string; subscriptionId: string; customerId?: string | null }) {
  if (!process.env.DATABASE_URL || !Number.isInteger(signupId)) return;
  try {
    const sql = connect(process.env.DATABASE_URL);
    await ensureSubscriptionColumns(sql);
    await sql`UPDATE artist_signups
      SET plan = ${data.plan}, subscription_status = ${data.status}, stripe_subscription_id = ${data.subscriptionId},
          stripe_customer_id = COALESCE(${data.customerId ?? null}, stripe_customer_id), subscribed_at = COALESCE(subscribed_at, now())
      WHERE id = ${signupId}`;
  } catch (e) {
    // Le paiement est validé chez Stripe : l'échec d'écriture est journalisé, pas bloquant.
    console.error("[abonnement] enregistrement Neon impossible :", e);
  }
}

/**
 * Mise à jour reçue par webhook Stripe (renouvellement, échec de paiement,
 * résiliation…). Retrouve l'inscription par son abonnement Stripe, sinon par
 * l'identifiant d'inscription enregistré dans les métadonnées.
 * Renvoie le nombre de lignes mises à jour. Lève une erreur si Neon échoue
 * (Stripe renverra alors l'événement plus tard).
 */
export async function applySubscriptionUpdate(u: SubscriptionUpdate): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  const sql = connect(process.env.DATABASE_URL);
  await ensureSubscriptionColumns(sql);
  const rows = (await sql`UPDATE artist_signups
    SET plan = ${u.plan}, subscription_status = ${u.status}, stripe_subscription_id = ${u.subscriptionId},
        stripe_customer_id = COALESCE(${u.customerId}, stripe_customer_id),
        cancel_at_period_end = ${u.cancelAtPeriodEnd}, current_period_end = ${u.periodEnd},
        subscribed_at = COALESCE(subscribed_at, now()), subscription_updated_at = now()
    WHERE stripe_subscription_id = ${u.subscriptionId}
       OR (${u.signupId}::int IS NOT NULL AND id = ${u.signupId}::int AND stripe_subscription_id IS NULL)
    RETURNING id`) as unknown[];
  return rows.length;
}
