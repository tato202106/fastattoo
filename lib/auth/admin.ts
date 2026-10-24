import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Accès « admin » (validation des profils) protégé par ADMIN_PASSWORD.
 * Cookie signé `expiration.signature` (HMAC-SHA256 avec le mot de passe) :
 * changer ADMIN_PASSWORD déconnecte toutes les sessions admin.
 */
export const ADMIN_SESSION_HOURS = 12;

function sign(secret: string, expires: number): string {
  return createHmac("sha256", secret).update(`fastattoo-admin:${expires}`).digest("hex");
}

export function adminToken(secret: string, nowMs: number): string {
  const expires = nowMs + ADMIN_SESSION_HOURS * 3600_000;
  return `${expires}.${sign(secret, expires)}`;
}

export function verifyAdminToken(secret: string | undefined, value: string | undefined, nowMs: number): boolean {
  if (!secret || !value) return false;
  const [exp, sig] = value.split(".");
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires < nowMs || !sig) return false;
  const expected = Buffer.from(sign(secret, expires), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Comparaison à temps constant du mot de passe admin. */
export function checkAdminPassword(secret: string | undefined, password: unknown): boolean {
  if (!secret || typeof password !== "string") return false;
  const a = createHmac("sha256", "cmp").update(secret).digest();
  const b = createHmac("sha256", "cmp").update(password).digest();
  return timingSafeEqual(a, b);
}
