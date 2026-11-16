import { listAccountReviews, replyToReview } from "@/lib/accounts/reviews-db";
import { currentAccount } from "@/lib/accounts/session";
import { parseReply } from "@/lib/reviews";

/** Avis reçus par le tatoueur connecté. */
export async function GET() {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour voir tes avis." }, { status: 401 });
  try {
    return Response.json({ reviews: await listAccountReviews(account.id) });
  } catch (e) {
    console.error("[avis] lecture impossible :", e);
    return Response.json({ error: "Lecture impossible." }, { status: 500 });
  }
}

/** Réponse publique du tatoueur à un avis (texte vide : retirer la réponse). */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour répondre." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Avis invalide" }, { status: 400 });
  const empty = typeof body?.reply === "string" && body.reply.trim() === "";
  const reply = empty ? null : parseReply(body);
  if (!empty && !reply) return Response.json({ error: "Écris ta réponse (2 caractères minimum)." }, { status: 422 });
  try {
    const review = await replyToReview(account.id, id, reply);
    if (!review) return Response.json({ error: "Avis introuvable." }, { status: 404 });
    return Response.json({ ok: true, review });
  } catch (e) {
    console.error("[avis] réponse impossible :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
