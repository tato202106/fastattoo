import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { ORIGINAL_MAX_WIDTH } from "@/lib/images";
import { storage } from "@/lib/storage";
import type { ImageAsset } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

/**
 * Upload d'une photo (portfolio, inspirations, messagerie).
 * L'original est normalisé (rotation EXIF, 2400 px max, métadonnées retirées)
 * puis stocké ; les variantes sont générées à la demande par /media/u.
 * NB : pas d'authentification pour l'instant (démo) — à protéger avant prod.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Fichier manquant" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image trop lourde (12 Mo max)" }, { status: 413 });
  if (file.type && !ACCEPTED.has(file.type)) return Response.json({ error: "Format non supporté" }, { status: 415 });

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const normalized = await sharp(input)
      .rotate()
      .resize({ width: ORIGINAL_MAX_WIDTH, height: ORIGINAL_MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    const { dominant } = await sharp(normalized.data).stats();
    const id = randomBytes(12).toString("hex");
    await storage().put(`${id}/source`, normalized.data);

    const hex = (n: number) => n.toString(16).padStart(2, "0");
    const asset: ImageAsset = {
      id,
      base: `/media/u/${id}`,
      width: normalized.info.width,
      height: normalized.info.height,
      color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
      alt: typeof form?.get("alt") === "string" ? String(form.get("alt")).slice(0, 140) : "",
    };
    return Response.json(asset, { status: 201 });
  } catch {
    return Response.json({ error: "Image illisible" }, { status: 422 });
  }
}
