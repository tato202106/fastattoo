import { currentAccount } from "@/lib/accounts/session";
import { sendEmail } from "@/lib/email";
import { addMessage, threadForArtist } from "@/lib/requests/db";
import { newMessageEmail, parseMessage } from "@/lib/requests/model";

/**
 * Réponse du tatoueur connecté : message, proposition de rendez-vous,
 * ou clôture de la demande (avec un message facultatif).
 * Le client reçoit un e-mail avec son lien privé.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/compte/demandes/[id]">) {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Connecte-toi pour répondre." }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Demande introuvable." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const decline = body?.decline === true;

  try {
    const thread = await threadForArtist(account.id, id);
    if (!thread) return Response.json({ error: "Demande introuvable." }, { status: 404 });

    const parsed = decline ? parseMessage({ text: body?.text || "Merci pour ta demande, mais je ne pourrai pas réaliser ce projet." }, { allowSlot: false }) : parseMessage(body, { allowSlot: true });
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });

    await addMessage(id, "artist", parsed.text, parsed.slot, decline ? "declined" : parsed.slot ? "proposed" : "replied");

    const link = `${new URL(req.url).origin}/demande/${thread.clientToken}`;
    const fromName = account.name || "Ton tatoueur";
    await sendEmail({ to: thread.clientEmail, ...newMessageEmail({ to: "client", fromName, text: parsed.text, slot: parsed.slot, link }) });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[demandes] réponse du tatoueur impossible :", e);
    return Response.json({ error: "Envoi impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
