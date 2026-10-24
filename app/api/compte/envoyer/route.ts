import { getAccount, submitProfile } from "@/lib/accounts/db";
import { missingForSubmission } from "@/lib/accounts/profile";
import { currentAccount } from "@/lib/accounts/session";
import { sendEmail, teamEmails } from "@/lib/email";

/** Envoie le profil pour validation par l'équipe Fastattoo. */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour envoyer ton profil." }, { status: 401 });
  if (account.status !== "draft") return Response.json({ ok: true, account });
  const missing = missingForSubmission(account);
  if (missing.length) return Response.json({ error: `Il manque encore : ${missing.join(", ")}.`, missing }, { status: 422 });
  try {
    await submitProfile(account.id);
    const team = teamEmails();
    if (team.length) {
      const origin = new URL(req.url).origin;
      await sendEmail({
        to: team,
        replyTo: account.email,
        subject: `Profil à valider : ${account.name} (${account.city})`,
        text: [
          `${account.name} a envoyé son profil pour validation.`,
          "",
          `Ville : ${account.city}`,
          `E-mail : ${account.email}`,
          `Abonnement : ${account.subscriptionStatus ?? "aucun"}`,
          "",
          `Valider ou refuser : ${origin}/admin`,
        ].join("\n"),
      });
    }
    return Response.json({ ok: true, account: await getAccount(account.id) });
  } catch (e) {
    console.error("[compte] envoi pour validation impossible :", e);
    return Response.json({ error: "Envoi impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
