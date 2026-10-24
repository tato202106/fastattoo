import { neon } from "@neondatabase/serverless";
import { tokenHash } from "../auth/password";

/**
 * Statut d'abonnement du compte connecté avec ce jeton de session (lecture seule,
 * utilisée par proxy.ts — volontairement sans « server-only » ni création de tables).
 * - undefined : aucune session valide (visiteur) ;
 * - null : compte sans abonnement ;
 * - sinon : statut Stripe enregistré (active, trialing, canceled…).
 */
export async function subscriptionStatusForToken(token: string): Promise<string | null | undefined> {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const sql = neon(url);
  const rows = (await sql`SELECT a.subscription_status FROM artist_sessions s JOIN artist_accounts a ON a.id = s.account_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now() LIMIT 1`) as { subscription_status: string | null }[];
  if (!rows[0]) return undefined;
  return rows[0].subscription_status ?? null;
}
