import { stripeEnabled } from "@/lib/billing/stripe";

/** Mode de paiement actif : « stripe » si une clé est configurée, sinon « demo ». */
export async function GET() {
  return Response.json({ mode: stripeEnabled() ? "stripe" : "demo" }, { headers: { "Cache-Control": "no-store" } });
}
