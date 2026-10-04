import "server-only";
import sharp from "sharp";
import { IMAGE_QUALITY, IMAGE_WIDTHS, variantWidth } from "../images";
import type { ImageFormat, ImageSize } from "../types";

/** Petit cache LRU en mémoire pour les variantes générées (évite de ré-encoder). */
class Lru<V> {
  private map = new Map<string, V>();
  constructor(private readonly max: number) {}
  get(key: string) {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, value: V) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

export const variantCache = new Lru<Buffer>(400);

type Pipeline = ReturnType<typeof sharp>;

export function encode(pipeline: Pipeline, format: ImageFormat): Promise<Buffer> {
  return format === "avif"
    ? pipeline.avif({ quality: IMAGE_QUALITY.avif, effort: 2 }).toBuffer()
    : pipeline.webp({ quality: IMAGE_QUALITY.webp, effort: 4 }).toBuffer();
}

/** Rendu d'un SVG vectoriel (œuvres de démo) à la largeur de la variante. */
export async function renderSvgVariant(svgAtWidth: (width: number) => string, size: ImageSize, format: ImageFormat) {
  const width = size === "original" ? 2000 : IMAGE_WIDTHS[size];
  return encode(sharp(Buffer.from(svgAtWidth(width))), format);
}

/** Variante d'une image uploadée à partir de l'original stocké. */
export async function renderBitmapVariant(original: Buffer, size: ImageSize, format: ImageFormat) {
  const meta = await sharp(original).metadata();
  const width = variantWidth(size, meta.width ?? IMAGE_WIDTHS.large);
  return encode(sharp(original).resize({ width, withoutEnlargement: true }), format);
}

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export function imageResponse(body: Buffer, format: ImageFormat) {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": `image/${format}`,
      "Cache-Control": IMMUTABLE_CACHE,
      "Content-Length": String(body.length),
    },
  });
}
