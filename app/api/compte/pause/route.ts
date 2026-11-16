import { pauseAccount, resumeAccount } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";

/**
 * Le tatoueur connecté met son profil en pause (congés, arrêt temporaire…) ou
 * le remet en ligne. La pause retire le profil de la carte sans toucher à
 * l'abonnement : pour ne plus payer, il le résilie depuis « Gérer mon abonnement ».
 */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour gérer ton profil." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { pause?: unknown } | null;
  if (typeof body?.pause !== "boolean") return Response.json({ error: "Requête invalide" }, { status: 400 });
  try {
    if (body.pause) {
      if (account.status !== "published") return Response.json({ error: "Ton profil n'est pas en ligne." }, { status: 409 });
      return Response.json({ ok: true, account: await pauseAccount(account.id, "owner") });
    }
    if (account.status !== "paused") return Response.json({ ok: true, account });
    return Response.json({ ok: true, account: await resumeAccount(account.id) });
  } catch (e) {
    console.error("[compte] pause du profil impossible :", e);
    return Response.json({ error: "Action impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
