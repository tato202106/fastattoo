import { addPhoto, countPhotos, deletePhoto, listPhotos, MAX_PHOTOS } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";
import { storeUpload, UploadError } from "@/lib/media/upload";
import { BODY_ZONES, isStyleSlug } from "@/lib/styles";
import type { BodyZone } from "@/lib/types";

export const runtime = "nodejs";

const ZONES = new Set<string>(BODY_ZONES.map((z) => z.slug));
const unauthorized = () => Response.json({ error: "Connecte-toi à ton espace tatoueur." }, { status: 401 });

/** Photos du portfolio du tatoueur connecté. */
export async function GET() {
  const account = await currentAccount();
  if (!account) return unauthorized();
  return Response.json({ photos: await listPhotos(account.id) }, { headers: { "Cache-Control": "no-store" } });
}

/** Ajoute une photo (champ « file », plus « style », « zone » et « alt » facultatifs). */
export async function POST(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  if ((await countPhotos(account.id)) >= MAX_PHOTOS) {
    return Response.json({ error: `Tu as atteint ${MAX_PHOTOS} photos : supprimes-en une pour en ajouter une nouvelle.` }, { status: 409 });
  }
  const form = await req.formData().catch(() => null);
  const field = (name: string) => {
    const v = form?.get(name);
    return typeof v === "string" ? v.trim() : "";
  };
  const style = field("style");
  const zone = field("zone");
  try {
    const image = await storeUpload(form?.get("file"), field("alt"));
    const photos = await addPhoto(account.id, image, {
      style: isStyleSlug(style) ? style : (account.styles[0] ?? "fine-line"),
      zone: ZONES.has(zone) ? (zone as BodyZone) : "avant-bras",
    });
    return Response.json({ photos }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: e.status });
    console.error("[compte] ajout de photo impossible :", e);
    return Response.json({ error: "Ajout impossible. Réessaie dans un instant." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const account = await currentAccount();
  if (!account) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Photo manquante" }, { status: 400 });
  try {
    return Response.json({ photos: await deletePhoto(account.id, id) });
  } catch (e) {
    console.error("[compte] suppression de photo impossible :", e);
    return Response.json({ error: "Suppression impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
