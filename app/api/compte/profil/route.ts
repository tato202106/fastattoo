import { updateProfile } from "@/lib/accounts/db";
import { geocode } from "@/lib/accounts/geocode";
import { parseProfile } from "@/lib/accounts/profile";
import { currentAccount } from "@/lib/accounts/session";

/** Enregistre le profil du tatoueur connecté (adresse géocodée pour la carte). */
export async function PUT(req: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour modifier ton profil." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Requête invalide" }, { status: 400 });
  const parsed = parseProfile(body);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 422 });

  const place = await geocode(parsed.value.address, parsed.value.city);
  if (!place) {
    return Response.json(
      { errors: { [parsed.value.address ? "address" : "city"]: "Adresse introuvable. Vérifie l'orthographe de l'adresse et de la ville." } },
      { status: 422 },
    );
  }
  try {
    const updated = await updateProfile(account.id, parsed.value, place);
    return Response.json({ ok: true, account: updated });
  } catch (e) {
    console.error("[compte] enregistrement du profil impossible :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
