import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Mots de passe et jetons des comptes tatoueurs (logique pure, testée).
 * Hachage scrypt (inclus dans Node, aucune dépendance) :
 * format stocké `scrypt$N$r$p$selBase64$hashBase64`.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;

/** Message d'erreur si le mot de passe ne convient pas, sinon null. */
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) return `Choisis un mot de passe d'au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (password.length > PASSWORD_MAX_LENGTH) return "Mot de passe trop long.";
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || typeof password !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;
  try {
    const actual = scryptSync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Jeton aléatoire (cookie de session, lien de réinitialisation). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte stockée en base à la place du jeton (une fuite de la base ne donne pas accès aux comptes). */
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenFormat(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
