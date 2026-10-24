import { storeUpload, UploadError } from "@/lib/media/upload";

export const runtime = "nodejs";

/**
 * Upload d'une photo (inspirations, messagerie de la démo).
 * Le portfolio des comptes tatoueurs passe par /api/compte/photos.
 * NB : pas d'authentification pour l'instant (démo) — à protéger avant prod.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  try {
    const alt = form?.get("alt");
    const asset = await storeUpload(form?.get("file"), typeof alt === "string" ? alt : "");
    return Response.json(asset, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: e.status });
    console.error("[upload] enregistrement impossible :", e);
    return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
