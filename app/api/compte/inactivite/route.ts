import { listPublishedAccounts, markInactivityNotice, pauseAccount } from "@/lib/accounts/db";
import { activeLinkSecret, activeLinkToken, inactivityNoticeEmail, inactivityPausedEmail, inactivityStep } from "@/lib/accounts/inactivity";
import { hasPaidAccess } from "@/lib/billing/access";
import { sendEmail, teamEmails } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contrôle quotidien des tatoueurs inactifs (cron Vercel, vercel.json, protégé
 * par CRON_SECRET). Voir lib/accounts/inactivity.ts :
 * - pas de connexion depuis 45 jours → e-mail « Tu tatoues toujours ? » ;
 * - toujours rien 15 jours après → profil mis en pause (hors de la carte),
 *   e-mail au tatoueur et récapitulatif à l'équipe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) return Response.json({ notified: 0, paused: 0, failed: 0 });

  const linkSecret = activeLinkSecret()!;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const now = new Date();
  let notified = 0;
  let failed = 0;
  const paused: string[] = [];
  try {
    for (const account of await listPublishedAccounts()) {
      const step = inactivityStep({ ...account, paid: hasPaidAccess(account.subscriptionStatus) }, now);
      if (step === "none") continue;
      const links = { active: `${origin}/toujours-actif?t=${activeLinkToken(linkSecret, account.id, now.getTime())}`, space: `${origin}/espace-tatoueur` };
      if (step === "notice") {
        const { subject, text } = inactivityNoticeEmail(account.name, links);
        if (await sendEmail({ to: account.email, subject, text })) {
          await markInactivityNotice(account.id);
          notified++;
        } else failed++;
        continue;
      }
      await pauseAccount(account.id, "inactivity");
      paused.push(`${account.name || "(sans nom)"} <${account.email}>`);
      const { subject, text } = inactivityPausedEmail(account.name, links);
      await sendEmail({ to: account.email, subject, text });
    }
  } catch (e) {
    console.error("[inactivité] contrôle impossible :", e);
    return Response.json({ error: "Contrôle impossible.", notified, paused: paused.length, failed }, { status: 500 });
  }
  const team = teamEmails();
  if (paused.length && team.length) {
    await sendEmail({
      to: team,
      subject: `Fastattoo : ${paused.length} profil${paused.length > 1 ? "s" : ""} mis en pause faute d'activité`,
      text: ["Profils retirés de la carte (sans réponse à l'e-mail « Tu tatoues toujours ? ») :", "", ...paused.map((p) => `- ${p}`)].join("\n"),
    });
  }
  console.info(`[inactivité] ${notified} e-mail(s) envoyé(s), ${paused.length} profil(s) mis en pause, ${failed} en échec`);
  return Response.json({ notified, paused: paused.length, failed });
}
