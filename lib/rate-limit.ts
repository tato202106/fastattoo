import { createHash } from "node:crypto";

/**
 * Limites contre les envois en rafale (logique pure, testée).
 * Les compteurs eux-mêmes sont gardés dans Neon (lib/rate-limit-db.ts), pour
 * valoir sur toutes les instances du serveur.
 */

export interface Limit {
  /** Nom du compteur (« upload », « connexion »…). */
  bucket: string;
  /** Nombre d'essais autorisés dans la fenêtre. */
  max: number;
  /** Durée de la fenêtre, en secondes. */
  windowSeconds: number;
}

export const LIMITS = {
  /** Photos envoyées sans compte (inspirations d'une demande). */
  upload: { bucket: "upload", max: 20, windowSeconds: 10 * 60 },
  /** Inscriptions tatoueur depuis une même connexion. */
  signup: { bucket: "inscription", max: 5, windowSeconds: 60 * 60 },
  /** Connexion à l'espace tatoueur : par connexion et par adresse e-mail. */
  loginIp: { bucket: "connexion-ip", max: 10, windowSeconds: 15 * 60 },
  loginEmail: { bucket: "connexion-email", max: 10, windowSeconds: 15 * 60 },
  /** Connexion à la page admin. */
  admin: { bucket: "admin", max: 5, windowSeconds: 15 * 60 },
  /** Demandes de projet envoyées aux tatoueurs. */
  request: { bucket: "demande", max: 6, windowSeconds: 10 * 60 },
  /** « Mot de passe oublié » : par connexion et par adresse e-mail. */
  resetIp: { bucket: "reset-ip", max: 5, windowSeconds: 60 * 60 },
  resetEmail: { bucket: "reset-email", max: 3, windowSeconds: 60 * 60 },
} as const satisfies Record<string, Limit>;

export const TOO_MANY_MESSAGE = "Trop d'essais. Réessaie dans quelques minutes.";

/** Adresse IP du visiteur (Vercel la place en tête de x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "inconnue";
}

/**
 * Clé de compteur : empreinte de la valeur (IP ou e-mail), pour ne jamais
 * stocker l'adresse elle-même en base.
 */
export function limitKey(bucket: string, value: string): string {
  const hash = createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
  return `${bucket}:${hash}`;
}

/** Nombre d'essais dans la fenêtre → l'essai est-il encore autorisé ? */
export function allowed(count: number, limit: Limit): boolean {
  return count <= limit.max;
}

/**
 * La requête vient-elle d'une page du site ? Un navigateur envoie toujours
 * l'en-tête Origin sur un envoi de formulaire en JavaScript ; une autre page
 * web ne peut pas se faire passer pour le site.
 */
export function sameOrigin(headers: Headers, requestUrl: string): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // outils sans navigateur : couverts par la limite d'envois
  try {
    return new URL(origin).host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}
