import "server-only";
import { randomBytes } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { ORIGINAL_MAX_WIDTH } from "@/lib/images";
import { storage } from "@/lib/storage";
import type { ImageAsset } from "@/lib/types";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Enregistre une photo : l'original est normalisé (rotation EXIF, 2400 px max,
 * métadonnées retirées) puis stocké ; les variantes sont générées à la demande
 * par /media/u.
 */
export async function storeUpload(file: unknown, alt: string): Promise<ImageAsset> {
  if (!(file instanceof File)) throw new UploadError("Fichier manquant", 400);
  if (file.size > MAX_BYTES) throw new UploadError("Image trop lourde (12 Mo max)", 413);
  if (file.type && !ACCEPTED.has(file.type)) throw new UploadError("Format non supporté", 415);

  let normalized: { data: Buffer; info: OutputInfo };
  let dominant: { r: number; g: number; b: number };
  try {
    const input = Buffer.from(await file.arrayBuffer());
    normalized = await sharp(input)
      .rotate()
      .resize({ width: ORIGINAL_MAX_WIDTH, height: ORIGINAL_MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    ({ dominant } = await sharp(normalized.data).stats());
  } catch {
    throw new UploadError("Image illisible", 422);
  }
  const id = randomBytes(12).toString("hex");
  await storage().put(`${id}/source`, normalized.data);

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return {
    id,
    base: `/media/u/${id}`,
    width: normalized.info.width,
    height: normalized.info.height,
    color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    alt: alt.slice(0, 140),
  };
}
