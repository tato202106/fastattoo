import { applySubscriptionUpdate } from "@/lib/billing/signups-db";
import { retrieveSubscription, stripeEnabled } from "@/lib/billing/stripe";
import { INVOICE_EVENTS, invoiceSubscriptionId, SUBSCRIPTION_EVENTS, toSubscriptionUpdate, verifySignature, type WebhookSubscription } from "@/lib/billing/webhook";

/**
 * Webhook Stripe : tient à jour l'abonnement des tatoueurs dans Neon
 * (fin d'essai, renouvellement, échec de paiement, résiliation…).
 * À déclarer dans Stripe → Développeurs → Webhooks, URL `/api/billing/webhook`,
 * avec le secret de signature dans STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripeEnabled()) return Response.json({ error: "Webhook Stripe non configuré" }, { status: 503 });

  // Corps brut : la signature porte sur le texte exact envoyé par Stripe.
  const payload = await req.text();
  if (!verifySignature(payload, req.headers.get("stripe-signature"), secret, Math.floor(Date.now() / 1000))) {
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  let event: { id?: string; type?: string; data?: { object?: unknown } };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 });
  }
  const type = event.type ?? "";
  const object = event.data?.object;

  try {
    let sub: WebhookSubscription | null = null;
    if (SUBSCRIPTION_EVENTS.has(type)) {
      sub = object as WebhookSubscription;
    } else if (INVOICE_EVENTS.has(type)) {
      // Relire l'abonnement : son état (actif, impayé…) après la facture.
      const subId = invoiceSubscriptionId(object as Parameters<typeof invoiceSubscriptionId>[0]);
      if (subId) sub = await retrieveSubscription(subId);
    }
    if (sub) {
      const updated = await applySubscriptionUpdate(toSubscriptionUpdate(sub));
      console.info(`[stripe] ${type} ${sub.id} → ${sub.status} (${updated} inscription(s) mise(s) à jour)`);
    }
    return Response.json({ received: true });
  } catch (e) {
    // Erreur temporaire (Neon, réseau) : code 500 pour que Stripe renvoie l'événement plus tard.
    console.error(`[stripe] échec du traitement de ${type} (${event.id ?? "?"}) :`, e);
    return Response.json({ error: "Traitement impossible" }, { status: 500 });
  }
}
