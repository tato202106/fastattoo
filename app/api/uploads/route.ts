import { storeUpload, UploadError } from "@/lib/media/upload";
import { LIMITS, sameOrigin } from "@/lib/rate-limit";
import { tooMany } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

/**
 * Upload d'une photo (inspirations d'une demande, sans compte).
 * Le portfolio des comptes tatoueurs passe par /api/compte/photos.
 * Ouvert sans connexion, donc protégé : envoi depuis une page du site
 * uniquement, et nombre d'envois limité par visiteur.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req.headers, req.url)) return Response.json({ error: "Envoi refusé" }, { status: 403 });
  const blocked = await tooMany(req, LIMITS.upload);
  if (blocked) return blocked;
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
