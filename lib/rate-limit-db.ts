import "server-only";
import { neon } from "@neondatabase/serverless";
import { allowed, clientIp, limitKey, TOO_MANY_MESSAGE, type Limit } from "./rate-limit";

let ready: Promise<void> | null = null;

function sql() {
  return neon(process.env.DATABASE_URL!);
}

function ensureTable(): Promise<void> {
  ready ??= (async () => {
    await sql()`CREATE TABLE IF NOT EXISTS rate_limits (
      key text PRIMARY KEY,
      window_start timestamptz NOT NULL DEFAULT now(),
      count integer NOT NULL DEFAULT 0
    )`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/**
 * Compte un essai et dit s'il est autorisé (fenêtre fixe par clé).
 * Sans base, ou si la base ne répond pas, on laisse passer : une panne du
 * compteur ne doit jamais bloquer les vrais visiteurs.
 */
export async function hit(limit: Limit, value: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return true;
  try {
    await ensureTable();
    const key = limitKey(limit.bucket, value);
    const rows = (await sql()`INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${limit.windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${limit.windowSeconds}) THEN now() ELSE rate_limits.window_start END
      RETURNING count`) as { count: number }[];
    // Ménage occasionnel des vieux compteurs.
    if (Math.random() < 0.02) await sql()`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
    return allowed(rows[0]?.count ?? 0, limit);
  } catch (e) {
    console.error("[limite] compteur indisponible :", e);
    return true;
  }
}

/**
 * Vérifie une ou plusieurs limites pour la requête ; renvoie la réponse 429 à
 * envoyer si l'une est dépassée, sinon null. `extra` : autres valeurs à
 * compter (ex. l'adresse e-mail visée), chacune avec sa limite.
 */
export async function tooMany(req: Request, ipLimit: Limit, extra: [Limit, string][] = []): Promise<Response | null> {
  const checks = [hit(ipLimit, clientIp(req.headers)), ...extra.filter(([, v]) => v).map(([l, v]) => hit(l, v))];
  const results = await Promise.all(checks);
  if (results.every(Boolean)) return null;
  await new Promise((r) => setTimeout(r, 400));
  return Response.json({ error: TOO_MANY_MESSAGE }, { status: 429, headers: { "Retry-After": "300" } });
}
