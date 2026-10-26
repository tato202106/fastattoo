import { isTokenFormat } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { addMessage, markRead, threadForClient } from "@/lib/requests/db";
import { newMessageEmail, parseMessage, slotLabel } from "@/lib/requests/model";

/** Conversation vue par le client (lien privé). */
export async function GET(_req: Request, ctx: RouteContext<"/api/demandes/[jeton]">) {
  const { jeton } = await ctx.params;
  if (!isTokenFormat(jeton) || !process.env.DATABASE_URL) return Response.json({ error: "Lien invalide." }, { status: 404 });
  try {
    const thread = await threadForClient(jeton);
    if (!thread) return Response.json({ error: "Lien invalide." }, { status: 404 });
    await markRead(thread.id, "client");
    const { accountId: _a, artistEmail: _e, ...publicThread } = thread;
    void _a;
    void _e;
    return Response.json({ thread: publicThread }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[demandes] lecture impossible :", e);
    return Response.json({ error: "Chargement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}

/** Réponse du client (texte, ou acceptation d'un rendez-vous proposé). */
export async function POST(req: Request, ctx: RouteContext<"/api/demandes/[jeton]">) {
  const { jeton } = await ctx.params;
  if (!isTokenFormat(jeton) || !process.env.DATABASE_URL) return Response.json({ error: "Lien invalide." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    const thread = await threadForClient(jeton);
    if (!thread) return Response.json({ error: "Lien invalide." }, { status: 404 });
    if (thread.status === "declined") return Response.json({ error: "Cette demande a été clôturée par le tatoueur." }, { status: 409 });

    let text: string;
    let accepted = false;
    if (typeof body?.acceptSlot === "number") {
      const proposal = thread.messages.find((m) => m.id === body.acceptSlot && m.from === "artist" && m.slot);
      if (!proposal?.slot) return Response.json({ error: "Proposition introuvable." }, { status: 404 });
      text = `✅ J'accepte le rendez-vous du ${slotLabel(proposal.slot)}.`;
      accepted = true;
    } else {
      const parsed = parseMessage(body, { allowSlot: false });
      if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
      text = parsed.text;
    }

    await addMessage(thread.id, "client", text, null, accepted ? "booked" : undefined);
    const link = `${new URL(req.url).origin}/espace-tatoueur/demandes/${thread.id}`;
    await sendEmail({ to: thread.artistEmail, ...newMessageEmail({ to: "artist", fromName: thread.clientName, text, slot: null, link }) });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[demandes] message client impossible :", e);
    return Response.json({ error: "Envoi impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
