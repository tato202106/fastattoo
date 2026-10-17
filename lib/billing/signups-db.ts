import "server-only";
import { neon } from "@neondatabase/serverless";
import type { PlanId } from "./plans";

/** Enregistre l'abonnement d'une inscription tatoueur (table artist_signups, colonnes ajoutées au besoin). */
export async function recordSignupSubscription(signupId: number, data: { plan: PlanId; status: string; subscriptionId: string; customerId?: string | null }) {
  if (!process.env.DATABASE_URL || !Number.isInteger(signupId)) return;
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`ALTER TABLE artist_signups
      ADD COLUMN IF NOT EXISTS plan text,
      ADD COLUMN IF NOT EXISTS subscription_status text,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
      ADD COLUMN IF NOT EXISTS stripe_customer_id text,
      ADD COLUMN IF NOT EXISTS subscribed_at timestamptz`;
    await sql`UPDATE artist_signups
      SET plan = ${data.plan}, subscription_status = ${data.status}, stripe_subscription_id = ${data.subscriptionId},
          stripe_customer_id = COALESCE(${data.customerId ?? null}, stripe_customer_id), subscribed_at = COALESCE(subscribed_at, now())
      WHERE id = ${signupId}`;
  } catch (e) {
    // Le paiement est validé chez Stripe : l'échec d'écriture est journalisé, pas bloquant.
    console.error("[abonnement] enregistrement Neon impossible :", e);
  }
}
