import { getAccount, recordActivity } from "@/lib/accounts/db";
import { activeLinkSecret, verifyActiveLinkToken } from "@/lib/accounts/inactivity";

/**
 * « Je suis toujours actif » depuis l'e-mail, sans mot de passe : le lien porte
 * un jeton signé. Appelé par le bouton de la page /toujours-actif (POST, pour
 * que l'aperçu automatique des liens par les messageries ne compte pas).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { t?: unknown } | null;
  const id = verifyActiveLinkToken(activeLinkSecret(), typeof body?.t === "string" ? body.t : null, Date.now());
  if (!id) return Response.json({ error: "Lien expiré ou invalide. Connecte-toi à ton espace tatoueur." }, { status: 400 });
  try {
    const account = await getAccount(id);
    if (!account) return Response.json({ error: "Compte introuvable." }, { status: 404 });
    const updated = await recordActivity(account);
    return Response.json({ ok: true, online: updated.status === "published" });
  } catch (e) {
    console.error("[compte] confirmation d'activité impossible :", e);
    return Response.json({ error: "Action impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
