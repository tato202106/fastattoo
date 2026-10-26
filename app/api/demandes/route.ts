import { newToken } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { createRequest, recipientFor } from "@/lib/requests/db";
import { accountIdFromArtistId, newRequestEmailToArtist, parseNewRequest, requestConfirmationEmail } from "@/lib/requests/model";

// Limite simple contre l'envoi en rafale (par instance du serveur).
const recent = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  if (recent.size > 5000) recent.clear();
  recent.set(ip, list);
  return list.length > 6;
}

/**
 * Demande de projet envoyée à un vrai tatoueur : enregistrée dans Neon,
 * e-mail au tatoueur, e-mail de confirmation au client avec son lien privé.
 */
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: "Envoi indisponible pour le moment." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (tooMany(ip)) return Response.json({ error: "Trop de demandes envoyées. Réessaie dans quelques minutes." }, { status: 429 });

  const parsed = parseNewRequest(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ errors: parsed.errors, error: Object.values(parsed.errors)[0] }, { status: 422 });
  const r = parsed.value;

  try {
    const accountId = accountIdFromArtistId(r.artistId)!;
    const artist = await recipientFor(accountId);
    if (!artist || artist.artistId !== r.artistId) return Response.json({ error: "Ce tatoueur ne reçoit pas de demandes pour le moment." }, { status: 404 });

    const token = newToken();
    const id = await createRequest(accountId, r, token);
    const origin = new URL(req.url).origin;
    const clientLink = `${origin}/demande/${token}`;
    const artistLink = `${origin}/espace-tatoueur/demandes/${id}`;

    const toArtist = newRequestEmailToArtist(r, artistLink);
    const toClient = requestConfirmationEmail(r, artist.name, clientLink);
    await Promise.all([sendEmail({ to: artist.email, ...toArtist }), sendEmail({ to: r.clientEmail, ...toClient })]);

    return Response.json({ ok: true, token });
  } catch (e) {
    console.error("[demandes] envoi impossible :", e);
    return Response.json({ error: "Envoi impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
