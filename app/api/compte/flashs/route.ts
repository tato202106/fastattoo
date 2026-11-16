import { addFlash, countFlashes, deleteFlash, listFlashes, updateFlash } from "@/lib/accounts/flashes-db";
import { currentAccount } from "@/lib/accounts/session";
import { type FlashInput, isFlashStatus, MAX_FLASHES, parseFlashInput } from "@/lib/flashes";
import { storeUpload, UploadError } from "@/lib/media/upload";

export const runtime = "nodejs";

const unauthorized = () => Response.json({ error: "Connecte-toi à ton espace tatoueur." }, { status: 401 });
const failed = (what: string, e: unknown) => {
  console.error(`[flashs] ${what} impossible :`, e);
  return Response.json({ error: "Action impossible. Réessaie dans un instant." }, { status: 500 });
};

/** Flashs du tatoueur connecté. */
export async function GET() {
  const account = await currentAccount();
  if (!account) return unauthorized();
  try {
    return Response.json({ flashes: await listFlashes(account.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failed("lecture", e);
  }
}

/** Ajoute un flash : image (« file ») + titre, prix, taille, style, pièce unique. */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Formulaire invalide." }, { status: 400 });
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = parseFlashInput(fields, account.styles[0] ?? "fine-line");
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
  try {
    if ((await countFlashes(account.id)) >= MAX_FLASHES) {
      return Response.json({ error: `Tu as atteint ${MAX_FLASHES} flashs : supprimes-en un pour en ajouter un nouveau.` }, { status: 409 });
    }
    const image = await storeUpload(form.get("file"), `Flash ${parsed.value.title}`);
    return Response.json({ flashes: await addFlash(account.id, image, parsed.value) }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: e.status });
    return failed("ajout", e);
  }
}

/** Change le statut (disponible, réservé, déjà tatoué) ou les infos d'un flash. */
export async function PATCH(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Flash manquant." }, { status: 400 });
  const status = isFlashStatus(body?.status) ? body.status : undefined;
  let input: FlashInput | undefined;
  if (body && "title" in body) {
    const parsed = parseFlashInput(body, account.styles[0] ?? "fine-line");
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
    input = parsed.value;
  }
  if (!status && !input) return Response.json({ error: "Rien à modifier." }, { status: 400 });
  try {
    return Response.json({ flashes: await updateFlash(account.id, id, { status, input }) });
  } catch (e) {
    return failed("modification", e);
  }
}

export async function DELETE(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Flash manquant." }, { status: 400 });
  try {
    return Response.json({ flashes: await deleteFlash(account.id, id) });
  } catch (e) {
    return failed("suppression", e);
  }
}
