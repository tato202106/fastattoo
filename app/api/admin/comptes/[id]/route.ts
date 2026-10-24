import { getAccount, publishAccount, unpublishAccount } from "@/lib/accounts/db";
import { isAdmin } from "@/lib/accounts/admin-session";
import { sendEmail } from "@/lib/email";

/** Publier ou retirer le profil d'un tatoueur (réservé à l'admin). */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/comptes/[id]">) {
  if (!(await isAdmin())) return Response.json({ error: "Accès refusé" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Compte invalide" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  try {
    if (body?.action === "publish") {
      const slug = await publishAccount(id);
      const account = await getAccount(id);
      if (account) {
        const url = `${new URL(req.url).origin}/tatoueurs/${slug}`;
        await sendEmail({
          to: account.email,
          subject: "Ton profil Fastattoo est en ligne 🎉",
          text: [
            `Bonjour ${account.name},`,
            "",
            "Bonne nouvelle : ton profil est validé et visible sur Fastattoo.",
            url,
            "",
            `Tu peux le modifier à tout moment depuis ton espace tatoueur : ${new URL(req.url).origin}/espace-tatoueur`,
            "",
            "L'équipe Fastattoo",
          ].join("\n"),
        });
      }
      return Response.json({ ok: true, account });
    }
    if (body?.action === "unpublish") {
      await unpublishAccount(id);
      return Response.json({ ok: true, account: await getAccount(id) });
    }
    return Response.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
