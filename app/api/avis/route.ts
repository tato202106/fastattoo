import { reviewContext, createReview } from "@/lib/accounts/reviews-db";
import { activeLinkSecret } from "@/lib/accounts/inactivity";
import { sendEmail } from "@/lib/email";
import { newReviewEmail, parseReview, verifyReviewLinkToken } from "@/lib/reviews";

/** Avis d'un client, déposé avec le lien personnel reçu après son rendez-vous. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const entryId = verifyReviewLinkToken(activeLinkSecret(), typeof body?.t === "string" ? body.t : null, Date.now());
  if (!entryId) return Response.json({ error: "Lien expiré ou invalide." }, { status: 400 });
  const parsed = parseReview(body);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 422 });
  try {
    const ctx = await reviewContext(entryId);
    if (!ctx) return Response.json({ error: "Ce rendez-vous n'existe plus." }, { status: 404 });
    if (ctx.alreadyReviewed || !(await createReview(ctx, parsed.value))) {
      return Response.json({ error: "Tu as déjà donné ton avis pour ce rendez-vous. Merci !" }, { status: 409 });
    }
    if (ctx.artist.email) {
      const { subject, text } = newReviewEmail(ctx.artist.name, parsed.value, `${new URL(req.url).origin}/espace-tatoueur#avis`);
      await sendEmail({ to: ctx.artist.email, subject, text });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[avis] enregistrement impossible :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
