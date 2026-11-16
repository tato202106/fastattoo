import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProfileStatus } from "./profile";

/**
 * Tatoueurs qui ont arrêté leur activité (logique pure, testée).
 *
 * Un tatoueur en ligne qui ne s'est pas connecté à son espace depuis
 * INACTIVE_AFTER_DAYS jours reçoit un e-mail « Tu tatoues toujours ? » :
 * « Je suis toujours actif » (un clic), mettre son profil en pause, ou résilier
 * son abonnement. Sans réponse ni connexion pendant PAUSE_AFTER_NOTICE_DAYS
 * jours, son profil est mis en pause : il quitte la carte pour que les clients
 * ne tombent pas sur un tatoueur qui ne répond plus. L'abonnement n'est jamais
 * résilié à sa place : c'est son choix. Une simple connexion le remet en ligne.
 */

export const INACTIVE_AFTER_DAYS = 45;
export const PAUSE_AFTER_NOTICE_DAYS = 15;

/** Pause choisie par le tatoueur, ou décidée faute d'activité. */
export type PauseReason = "owner" | "inactivity";

export type InactivityStep = "notice" | "pause" | "none";

const DAY_MS = 86_400_000;

const time = (v: string | null | undefined) => (v ? Date.parse(v) : NaN);

export function inactivityStep(
  a: { status: ProfileStatus; paid: boolean; createdAt: string; lastActiveAt: string | null; inactivityNoticeAt: string | null },
  now: Date,
): InactivityStep {
  if (a.status !== "published" || !a.paid) return "none";
  const created = time(a.createdAt);
  const active = time(a.lastActiveAt);
  const last = Math.max(Number.isFinite(created) ? created : 0, Number.isFinite(active) ? active : 0);
  if (!last) return "none";
  const notice = time(a.inactivityNoticeAt);
  // E-mail déjà envoyé depuis la dernière activité : on attend sa réponse.
  if (Number.isFinite(notice) && notice >= last) {
    return now.getTime() - notice >= PAUSE_AFTER_NOTICE_DAYS * DAY_MS ? "pause" : "none";
  }
  return now.getTime() - last >= INACTIVE_AFTER_DAYS * DAY_MS ? "notice" : "none";
}

/** Une connexion du tatoueur remet en ligne un profil mis en pause faute d'activité (pas une pause qu'il a choisie). */
export function resumesOnActivity(a: { status: ProfileStatus; pausedReason: PauseReason | null }): boolean {
  return a.status === "paused" && a.pausedReason === "inactivity";
}

/* ---------- Lien « Je suis toujours actif » (sans mot de passe) ---------- */

export const ACTIVE_LINK_DAYS = 30;

function sign(secret: string, accountId: number, expires: number): string {
  return createHmac("sha256", secret).update(`fastattoo-actif:${accountId}:${expires}`).digest("hex");
}

/** Jeton signé `compte.expiration.signature`, valable ACTIVE_LINK_DAYS jours. */
export function activeLinkToken(secret: string, accountId: number, nowMs: number): string {
  const expires = nowMs + ACTIVE_LINK_DAYS * DAY_MS;
  return `${accountId}.${expires}.${sign(secret, accountId, expires)}`;
}

/** Compte du lien, ou null si le jeton est invalide ou expiré. */
export function verifyActiveLinkToken(secret: string | undefined, token: string | null | undefined, nowMs: number): number | null {
  if (!secret || !token) return null;
  const [id, exp, sig] = token.split(".");
  const accountId = Number(id);
  const expires = Number(exp);
  if (!Number.isInteger(accountId) || accountId <= 0 || !Number.isFinite(expires) || expires < nowMs || !sig || !/^[0-9a-f]+$/.test(sig)) return null;
  const expected = Buffer.from(sign(secret, accountId, expires), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? accountId : null;
}

/** Secret des liens : ACTIVITY_LINK_SECRET, sinon CRON_SECRET (déjà configuré pour les rappels). */
export function activeLinkSecret(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.ACTIVITY_LINK_SECRET || env.CRON_SECRET || undefined;
}

/* ---------- E-mails ---------- */

export function inactivityNoticeEmail(name: string, links: { active: string; space: string }): { subject: string; text: string } {
  return {
    subject: "Tu tatoues toujours ? Ton profil Fastattoo t'attend",
    text: [
      `Bonjour ${name || ""}`.trim() + ",",
      "",
      `On ne t'a pas vu dans ton espace tatoueur depuis plus de ${INACTIVE_AFTER_DAYS} jours.`,
      "Pour que les clients ne tombent pas sur un profil qui ne répond plus, dis-nous où tu en es :",
      "",
      "✅ Je tatoue toujours (un clic, rien d'autre à faire) :",
      links.active,
      "",
      "⏸️ Je fais une pause (congés, déménagement…) : mets ton profil en pause depuis ton espace. Tes photos et tes avis sont gardés.",
      links.space,
      "",
      "🛑 J'arrête mon activité : résilie ton abonnement depuis ton espace (« Mon abonnement » → « Gérer mon abonnement ») pour ne plus être prélevé.",
      links.space,
      "",
      `Sans nouvelles de ta part d'ici ${PAUSE_AFTER_NOTICE_DAYS} jours, ton profil sera mis en pause et retiré de la carte. Ton abonnement, lui, continue : pense à le résilier si tu arrêtes.`,
      "",
      "L'équipe Fastattoo",
    ].join("\n"),
  };
}

export function inactivityPausedEmail(name: string, links: { active: string; space: string }): { subject: string; text: string } {
  return {
    subject: "Ton profil Fastattoo est en pause",
    text: [
      `Bonjour ${name || ""}`.trim() + ",",
      "",
      "Sans nouvelles de ta part, on a mis ton profil en pause : il n'apparaît plus sur la carte ni dans la recherche. Tes photos et tes avis sont gardés.",
      "",
      "Tu tatoues toujours ? Un clic et ton profil revient en ligne :",
      links.active,
      "",
      "Tu as arrêté ton activité ? Pense à résilier ton abonnement pour ne plus être prélevé (« Mon abonnement » → « Gérer mon abonnement ») :",
      links.space,
      "",
      "L'équipe Fastattoo",
    ].join("\n"),
  };
}
