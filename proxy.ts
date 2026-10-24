import { NextResponse, type NextRequest } from "next/server";
import { subscriptionStatusForToken } from "@/lib/accounts/access-db";
import { isTokenFormat } from "@/lib/auth/password";
import { gateDecision, hasPaidAccess, PAYMENT_PATH, requiresPayment } from "@/lib/billing/access";
import { stripeConfigured } from "@/lib/billing/env";

/**
 * Paiement obligatoire pour accéder à l'espace tatoueur : un compte connecté
 * dont l'abonnement n'est pas actif y est renvoyé vers la page de paiement.
 * Le reste du site (accueil, carte, profils…) reste ouvert à tous, et les
 * visiteurs ne sont pas concernés (aucune requête en base sans cookie de compte).
 */
const ACCOUNT_COOKIE = "ft_account"; // même nom que lib/accounts/session.ts

// Petit cache des comptes à jour de paiement (jamais des comptes non payés,
// pour que l'accès s'ouvre dès le paiement validé).
const PAID_TTL_MS = 60_000;
const paidCache = new Map<string, number>();

export async function proxy(request: NextRequest) {
  const enabled = Boolean(stripeConfigured() && process.env.DATABASE_URL);
  const token = request.cookies.get(ACCOUNT_COOKIE)?.value;
  if (!enabled || !isTokenFormat(token) || !requiresPayment(request.nextUrl.pathname)) return NextResponse.next();

  const cachedAt = paidCache.get(token);
  if (cachedAt && Date.now() - cachedAt < PAID_TTL_MS) return NextResponse.next();

  let status: string | null | undefined;
  try {
    status = await subscriptionStatusForToken(token);
  } catch (e) {
    // Base indisponible : on ne bloque pas tout le site pour autant.
    console.error("[accès] vérification de l'abonnement impossible :", e);
    return NextResponse.next();
  }
  if (hasPaidAccess(status)) {
    if (paidCache.size > 5000) paidCache.clear();
    paidCache.set(token, Date.now());
  }
  if (gateDecision({ enabled, pathname: request.nextUrl.pathname, status }) === "allow") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = PAYMENT_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Espace tatoueur uniquement : le reste du site n'interroge jamais la base ici.
  matcher: ["/espace-tatoueur", "/espace-tatoueur/:path*"],
};
