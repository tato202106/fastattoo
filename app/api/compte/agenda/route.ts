import { createAgendaEntry, deleteAgendaEntry, listAgenda, updateAgendaEntry } from "@/lib/accounts/agenda-db";
import { currentAccount } from "@/lib/accounts/session";
import { isISODate, MAX_RANGE_DAYS, parseAgendaInput } from "@/lib/agenda";
import { diffDays } from "@/lib/dates";

export const runtime = "nodejs";

const unauthorized = () => Response.json({ error: "Connecte-toi à ton espace tatoueur." }, { status: 401 });
const failed = () => Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
const noStore = { "Cache-Control": "no-store" };

function entryId(req: Request): number | null {
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Agenda du tatoueur connecté entre ?from= et ?to= (YYYY-MM-DD, inclus). */
export async function GET(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const params = new URL(req.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if (!isISODate(from) || !isISODate(to) || to < from || diffDays(from, to) > MAX_RANGE_DAYS) {
    return Response.json({ error: "Période invalide." }, { status: 400 });
  }
  try {
    return Response.json({ entries: await listAgenda(account.id, from, to) }, { headers: noStore });
  } catch (e) {
    console.error("[agenda] lecture impossible :", e);
    return Response.json({ error: "Impossible de charger ton agenda. Réessaie dans un instant." }, { status: 500 });
  }
}

/** Ajoute un rendez-vous ou une indisponibilité. */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const parsed = parseAgendaInput(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });
  try {
    return Response.json({ entry: await createAgendaEntry(account.id, parsed.value) }, { status: 201 });
  } catch (e) {
    console.error("[agenda] ajout impossible :", e);
    return failed();
  }
}

/** Modifie une entrée (?id=). */
export async function PATCH(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const id = entryId(req);
  if (!id) return Response.json({ error: "Entrée manquante." }, { status: 400 });
  const parsed = parseAgendaInput(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });
  try {
    const entry = await updateAgendaEntry(account.id, id, parsed.value);
    if (!entry) return Response.json({ error: "Cette entrée n'existe plus." }, { status: 404 });
    return Response.json({ entry });
  } catch (e) {
    console.error("[agenda] modification impossible :", e);
    return failed();
  }
}

/** Supprime une entrée (?id=). */
export async function DELETE(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const id = entryId(req);
  if (!id) return Response.json({ error: "Entrée manquante." }, { status: 400 });
  try {
    await deleteAgendaEntry(account.id, id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[agenda] suppression impossible :", e);
    return Response.json({ error: "Suppression impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
