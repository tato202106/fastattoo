import { createHmac, timingSafeEqual } from "node:crypto";
import { addDays } from "./dates";

/**
 * Avis des vrais clients (logique pure, testée).
 *
 * Seul un client qui a eu un rendez-vous noté dans l'agenda du tatoueur peut
 * donner un avis : le lendemain du rendez-vous, il reçoit par e-mail un lien
 * personnel, signé, valable REVIEW_LINK_DAYS jours et utilisable une seule
 * fois (un avis par rendez-vous). Un tatoueur ne peut donc ni se noter
 * lui-même ni être noté par un inconnu.
 */

export const REVIEW_LINK_DAYS = 60;
/** On demande un avis pour les rendez-vous des REVIEW_REQUEST_DAYS derniers jours (hier compris). */
export const REVIEW_REQUEST_DAYS = 7;
export const REVIEW_TEXT_MAX = 1000;
export const REPLY_TEXT_MAX = 600;

const DAY_MS = 86_400_000;

/* ---------- Lien personnel ---------- */

function sign(secret: string, entryId: number, expires: number): string {
  return createHmac("sha256", secret).update(`fastattoo-avis:${entryId}:${expires}`).digest("hex");
}

/** Jeton `rendez-vous.expiration.signature`. */
export function reviewLinkToken(secret: string, entryId: number, nowMs: number): string {
  const expires = nowMs + REVIEW_LINK_DAYS * DAY_MS;
  return `${entryId}.${expires}.${sign(secret, entryId, expires)}`;
}

/** Rendez-vous du lien, ou null si le jeton est invalide ou expiré. */
export function verifyReviewLinkToken(secret: string | undefined, token: string | null | undefined, nowMs: number): number | null {
  if (!secret || !token) return null;
  const [id, exp, sig] = token.split(".");
  const entryId = Number(id);
  const expires = Number(exp);
  if (!Number.isInteger(entryId) || entryId <= 0 || !Number.isFinite(expires) || expires < nowMs || !sig || !/^[0-9a-f]+$/.test(sig)) return null;
  const expected = Buffer.from(sign(secret, entryId, expires), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? entryId : null;
}

/** Jours des rendez-vous pour lesquels demander un avis : de J-7 à hier. */
export function reviewRequestWindow(today: string): { from: string; to: string } {
  return { from: addDays(today, -REVIEW_REQUEST_DAYS), to: addDays(today, -1) };
}

/* ---------- Formulaire ---------- */

/** Nom affiché : « Marie D. » (prénom + initiale du nom), jamais le nom complet. */
export function publicAuthorName(clientName: string): string {
  const parts = clientName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  const first = parts[0]!.slice(0, 30);
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

export type ReviewInput = { rating: number; text: string; author: string };
export type ReviewErrors = Partial<Record<keyof ReviewInput, string>>;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+\n/g, "\n").trim().slice(0, max) : "");

export function parseReview(body: unknown): { ok: true; value: ReviewInput } | { ok: false; errors: ReviewErrors } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const rating = Number(b.rating);
  const text = clean(b.text, REVIEW_TEXT_MAX);
  const author = clean(b.author, 40).replace(/\s+/g, " ");
  const errors: ReviewErrors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Choisis une note de 1 à 5 étoiles.";
  if (author.length < 2) errors.author = "Indique ton prénom.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { rating, text, author } };
}

export function parseReply(body: unknown): string | null {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = clean(b.reply, REPLY_TEXT_MAX);
  return text.length >= 2 ? text : null;
}

/* ---------- Note du tatoueur ---------- */

/** Moyenne (2 décimales) et nombre d'avis publiés. */
export function summarizeRatings(ratings: number[]): { rating: number; count: number } {
  if (ratings.length === 0) return { rating: 0, count: 0 };
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return { rating: Math.round(avg * 100) / 100, count: ratings.length };
}

/** Identifiant de l'avis dans la table `reviews` lue par le site. */
export function siteReviewId(reviewId: number): string {
  return `acc-rev-${reviewId}`;
}

/* ---------- E-mails ---------- */

export function reviewRequestEmail(clientName: string, artist: { name: string; studio: string }, link: string): { subject: string; text: string } {
  const who = artist.name || "ton tatoueur";
  return {
    subject: `Comment s'est passé ton tatouage avec ${who} ?`,
    text: [
      `Bonjour ${clientName || ""}`.trim() + ",",
      "",
      `Tu as eu rendez-vous récemment avec ${who}${artist.studio ? ` (${artist.studio})` : ""}. Ton avis compte : il aide les autres clients à choisir un tatoueur pour la qualité de son travail.`,
      "",
      "Donne ta note en 30 secondes (lien personnel, sans inscription) :",
      link,
      "",
      "Merci !",
      "",
      "—",
      "Envoyé par Fastattoo. Ce lien ne sert qu'une fois et n'est valable que pour ce rendez-vous.",
    ].join("\n"),
  };
}

export function newReviewEmail(artistName: string, review: ReviewInput, spaceUrl: string): { subject: string; text: string } {
  return {
    subject: `Nouvel avis ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)} sur ton profil Fastattoo`,
    text: [
      `Bonjour ${artistName || ""}`.trim() + ",",
      "",
      `${review.author} vient de laisser un avis : ${review.rating}/5.`,
      ...(review.text ? ["", `« ${review.text} »`] : []),
      "",
      `Tu peux lui répondre publiquement depuis ton espace tatoueur : ${spaceUrl}`,
      "",
      "L'équipe Fastattoo",
    ].join("\n"),
  };
}
