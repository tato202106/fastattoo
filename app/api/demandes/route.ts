import { newToken } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { LIMITS } from "@/lib/rate-limit";
import { tooMany } from "@/lib/rate-limit-db";
import { createRequest, recipientFor } from "@/lib/requests/db";
import { accountIdFromArtistId, newRequestEmailToArtist, parseNewRequest, requestConfirmationEmail } from "@/lib/requests/model";

/**
 * Demande de projet envoyée à un vrai tatoueur : enregistrée dans Neon,
 * e-mail au tatoueur, e-mail de confirmation au client avec son lien privé.
 */
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: "Envoi indisponible pour le moment." }, { status: 503 });
  // Limite contre l'envoi en rafale, partagée entre toutes les instances du serveur.
  const blocked = await tooMany(req, LIMITS.request);
  if (blocked) return blocked;

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
