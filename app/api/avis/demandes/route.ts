import { claimReviewRequest, dueReviewRequests, releaseReviewRequest } from "@/lib/accounts/reviews-db";
import { activeLinkSecret } from "@/lib/accounts/inactivity";
import { dateInTimeZone } from "@/lib/agenda";
import { hasPaidAccess } from "@/lib/billing/access";
import { sendEmail } from "@/lib/email";
import { reviewLinkToken, reviewRequestEmail, reviewRequestWindow } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demandes d'avis : après chaque rendez-vous noté dans l'agenda d'un tatoueur
 * en ligne (avec l'e-mail du client), le client reçoit un lien personnel pour
 * donner sa note. Lancé chaque jour par le cron Vercel (vercel.json, CRON_SECRET),
 * pour les rendez-vous d'hier et des jours précédents (rattrapage d'un passage manqué).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) return Response.json({ sent: 0, skipped: 0, failed: 0 });

  const linkSecret = activeLinkSecret()!;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const now = new Date();
  const { from, to } = reviewRequestWindow(dateInTimeZone(now));
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  try {
    for (const due of await dueReviewRequests(from, to)) {
      if (!hasPaidAccess(due.subscriptionStatus)) {
        skipped++;
        continue;
      }
      if (!(await claimReviewRequest(due.entryId))) continue;
      const link = `${origin}/avis?t=${reviewLinkToken(linkSecret, due.entryId, now.getTime())}`;
      const { subject, text } = reviewRequestEmail(due.clientName, due.artist, link);
      if (await sendEmail({ to: due.clientEmail, subject, text })) sent++;
      else {
        failed++;
        await releaseReviewRequest(due.entryId).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[avis] envoi des demandes impossible :", e);
    return Response.json({ error: "Envoi des demandes impossible.", sent, skipped, failed }, { status: 500 });
  }
  console.info(`[avis] demandes du ${from} au ${to} : ${sent} envoyée(s), ${skipped} ignorée(s), ${failed} en échec`);
  return Response.json({ from, to, sent, skipped, failed });
}
