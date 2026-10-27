import { setOpeningHours } from "@/lib/accounts/db";
import { parseOpeningHours } from "@/lib/accounts/availability";
import { currentAccount } from "@/lib/accounts/session";

/** Horaires d'ouverture du tatoueur connecté (affichés sur son profil public). */
export async function PUT(req: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi à ton espace tatoueur." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { hours?: unknown } | null;
  const parsed = parseOpeningHours(body?.hours);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
  try {
    const updated = await setOpeningHours(account.id, parsed.value);
    return Response.json({ ok: true, account: updated });
  } catch (e) {
    console.error("[compte] horaires :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
