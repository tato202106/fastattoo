import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "./plans";

/**
 * Webhook Stripe : vérification de signature et lecture des événements.
 * Logique pure (sans réseau ni base), testée par Vitest.
 * Doc Stripe : en-tête `Stripe-Signature: t=<horodatage>,v1=<hmac>[,v1=…]`,
 * HMAC-SHA256 de `${t}.${corps brut}` avec le secret de signature `whsec_…`.
 */

/** Tolérance par défaut sur l'horodatage (protection contre le rejeu). */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export function parseSignatureHeader(header: string | null | undefined): { timestamp: number; signatures: string[] } | null {
  if (!header) return null;
  let timestamp = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2).map((s) => s?.trim());
    if (!key || !value) continue;
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") signatures.push(value);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function computeSignature(payload: string, timestamp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
}

/** true si l'une des signatures v1 correspond et que l'horodatage est récent. */
export function verifySignature(payload: string, header: string | null | undefined, secret: string, nowSeconds: number, tolerance = WEBHOOK_TOLERANCE_SECONDS): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed || !secret) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > tolerance) return false;
  const expected = Buffer.from(computeSignature(payload, parsed.timestamp, secret), "hex");
  return parsed.signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Champs d'abonnement Stripe utilisés ici (compatibles avec les versions récentes de l'API). */
export interface WebhookSubscription {
  id: string;
  object?: string;
  status: string;
  customer?: string | { id: string } | null;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number; price?: { recurring?: { interval?: string } | null } }[] };
  metadata?: Record<string, string>;
}

export interface SubscriptionUpdate {
  subscriptionId: string;
  signupId: number | null;
  customerId: string | null;
  status: string;
  plan: PlanId;
  cancelAtPeriodEnd: boolean;
  /** Fin de la période en cours (AAAA-MM-JJ). */
  periodEnd: string | null;
}

const isoDay = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : null);

/** Ce qu'il faut enregistrer dans Neon pour un abonnement reçu par webhook. */
export function toSubscriptionUpdate(sub: WebhookSubscription): SubscriptionUpdate {
  const item = sub.items?.data?.[0];
  const signupId = Number(sub.metadata?.signup_id);
  return {
    subscriptionId: sub.id,
    signupId: Number.isInteger(signupId) && signupId > 0 ? signupId : null,
    customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    status: sub.status,
    plan: item?.price?.recurring?.interval === "year" ? "annual" : "monthly",
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    periodEnd: isoDay(sub.current_period_end ?? item?.current_period_end),
  };
}

/** Événements d'abonnement qui portent directement l'objet abonnement. */
export const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/** Événements de facture : on relit l'abonnement concerné chez Stripe. */
export const INVOICE_EVENTS = new Set(["invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed"]);
export const CHECKOUT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/** Identifiant d'abonnement d'une facture (ancien et nouveau format de l'API). */
export function invoiceSubscriptionId(invoice: {
  subscription?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
}): string | null {
  const raw = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}
