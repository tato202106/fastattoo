import { accountForReset, createPasswordReset } from "@/lib/accounts/db";
import { newToken } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";

/**
 * Envoie un lien pour choisir un nouveau mot de passe (valable 1 h).
 * Réponse identique que l'e-mail existe ou non (on ne révèle pas qui est inscrit).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 160) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "Adresse e-mail invalide." }, { status: 422 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Service indisponible pour le moment." }, { status: 503 });
  try {
    const accountId = await accountForReset(email);
    if (accountId) {
      const token = newToken();
      await createPasswordReset(accountId, token);
      const link = `${new URL(req.url).origin}/espace-tatoueur/nouveau-mot-de-passe?jeton=${token}`;
      await sendEmail({
        to: email,
        subject: "Ton lien pour choisir un mot de passe Fastattoo",
        text: [
          "Bonjour,",
          "",
          "Pour choisir un nouveau mot de passe pour ton espace tatoueur Fastattoo, ouvre ce lien (valable 1 heure) :",
          link,
          "",
          "Si tu n'as rien demandé, ignore simplement cet e-mail.",
          "",
          "L'équipe Fastattoo",
        ].join("\n"),
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[compte] mot de passe oublié :", e);
    return Response.json({ error: "Envoi impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
