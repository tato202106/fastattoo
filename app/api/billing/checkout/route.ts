import { isPlanId } from "@/lib/billing/plans";
import { createCheckoutSession, stripeEnabled } from "@/lib/billing/stripe";

/** Crée une session Stripe Checkout et renvoie l'URL de paiement. */
export async function POST(req: Request) {
  if (!stripeEnabled()) return Response.json({ mode: "demo" }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { plan?: unknown; email?: unknown; artistId?: unknown } | null;
  if (!body || !isPlanId(body.plan)) return Response.json({ error: "Forfait invalide" }, { status: 400 });
  const email = typeof body.email === "string" && /\S+@\S+\.\S+/.test(body.email) ? body.email.slice(0, 200) : undefined;
  const artistId = typeof body.artistId === "string" ? body.artistId.slice(0, 40) : "inconnu";
  try {
    const session = await createCheckoutSession({ plan: body.plan, email, artistId, origin: new URL(req.url).origin });
    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
