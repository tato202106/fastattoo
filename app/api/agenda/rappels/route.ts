import { claimReminder, dueReminders, releaseReminder } from "@/lib/accounts/agenda-db";
import { reminderDate, reminderEmail } from "@/lib/agenda";
import { hasPaidAccess } from "@/lib/billing/access";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rappels de la veille : envoie un e-mail à chaque client qui a rendez-vous demain
 * (heure de Paris / Bruxelles), une seule fois par rendez-vous. Lancé chaque jour
 * par le cron Vercel (vercel.json), qui s'authentifie avec CRON_SECRET.
 * Seuls les tatoueurs abonnés en profitent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) return Response.json({ sent: 0, skipped: 0, failed: 0 });

  const day = reminderDate(new Date());
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  try {
    for (const { appointment, artist, subscriptionStatus } of await dueReminders(day)) {
      if (!hasPaidAccess(subscriptionStatus)) {
        skipped++;
        continue;
      }
      if (!(await claimReminder(appointment.id))) continue; // déjà envoyé par un autre passage
      const { subject, text } = reminderEmail(appointment, artist);
      const ok = await sendEmail({ to: appointment.clientEmail, subject, text, replyTo: artist.email || undefined });
      if (ok) sent++;
      else {
        failed++;
        await releaseReminder(appointment.id).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[agenda] envoi des rappels impossible :", e);
    return Response.json({ error: "Envoi des rappels impossible.", sent, skipped, failed }, { status: 500 });
  }
  console.info(`[agenda] rappels du ${day} : ${sent} envoyé(s), ${skipped} ignoré(s), ${failed} en échec`);
  return Response.json({ day, sent, skipped, failed });
}
