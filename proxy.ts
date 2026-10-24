import { NextResponse, type NextRequest } from "next/server";
import { subscriptionStatusForToken } from "@/lib/accounts/access-db";
import { isTokenFormat } from "@/lib/auth/password";
import { gateDecision, hasPaidAccess, PAYMENT_PATH } from "@/lib/billing/access";

/**
 * Paiement obligatoire pour les tatoueurs : un compte connecté dont
 * l'abonnement n'est pas actif est renvoyé vers la page de paiement, quelle
 * que soit la page demandée. Les visiteurs ne sont pas concernés (aucune
 * requête en base sans cookie de compte).
 */
const ACCOUNT_COOKIE = "ft_account"; // même nom que lib/accounts/session.ts

// Petit cache des comptes à jour de paiement (jamais des comptes non payés,
// pour que l'accès s'ouvre dès le paiement validé).
const PAID_TTL_MS = 60_000;
const paidCache = new Map<string, number>();

export async function proxy(request: NextRequest) {
  const enabled = Boolean(process.env.STRIPE_SECRET_KEY && process.env.DATABASE_URL);
  const token = request.cookies.get(ACCOUNT_COOKIE)?.value;
  if (!enabled || !isTokenFormat(token)) return NextResponse.next();

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
  // Pages uniquement : pas d'API, de fichiers statiques, d'images ni du service worker.
  matcher: ["/((?!api/|_next/|media/|icons/|vendor/|favicon|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.[a-z0-9]+$).*)"],
};
