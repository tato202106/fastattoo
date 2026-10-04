import type { ImageAsset, ImageFormat, ImageSize } from "./types";

/** Largeur cible (px) de chaque variante. `original` = largeur source, plafonnée. */
export const IMAGE_WIDTHS: Record<Exclude<ImageSize, "original">, number> = {
  thumbnail: 200,
  small: 400,
  medium: 800,
  large: 1600,
};
export const ORIGINAL_MAX_WIDTH = 2400;

export const IMAGE_SIZES: ImageSize[] = ["thumbnail", "small", "medium", "large", "original"];
export const IMAGE_FORMATS: ImageFormat[] = ["avif", "webp"];

export const IMAGE_QUALITY: Record<ImageFormat, number> = { avif: 52, webp: 74 };

export function isImageSize(v: string): v is ImageSize {
  return (IMAGE_SIZES as string[]).includes(v);
}
export function isImageFormat(v: string): v is ImageFormat {
  return (IMAGE_FORMATS as string[]).includes(v);
}

/** Parse « medium.webp » → { size, format }. */
export function parseVariantFile(file: string): { size: ImageSize; format: ImageFormat } | null {
  const m = /^([a-z]+)\.([a-z]+)$/.exec(file);
  if (!m) return null;
  const [, size, format] = m;
  if (!size || !format || !isImageSize(size) || !isImageFormat(format)) return null;
  return { size, format };
}

/** Largeur de sortie d'une variante. On n'agrandit jamais une image source plus petite. */
export function variantWidth(size: ImageSize, sourceWidth: number): number {
  if (size === "original") return Math.min(sourceWidth, ORIGINAL_MAX_WIDTH);
  return Math.min(IMAGE_WIDTHS[size], sourceWidth);
}

export function imageUrl(image: Pick<ImageAsset, "base">, size: ImageSize, format: ImageFormat = "webp"): string {
  return `${image.base}/${size}.${format}`;
}

/**
 * srcset avec descripteurs de largeur. On limite volontairement les tailles
 * proposées pour que le navigateur reste dans la résolution voulue par l'écran :
 * liste → thumbnail (+small en 2x), profil → small/medium, plein écran → medium/large.
 */
export type ImageUsage = "list" | "profile" | "fullscreen" | "avatar" | "cover";

export const USAGE_SIZES: Record<ImageUsage, Exclude<ImageSize, "original">[]> = {
  list: ["thumbnail", "small"],
  avatar: ["thumbnail", "small"],
  profile: ["small", "medium"],
  cover: ["medium", "large"],
  fullscreen: ["medium", "large"],
};

export function srcSet(image: Pick<ImageAsset, "base">, usage: ImageUsage, format: ImageFormat): string {
  return USAGE_SIZES[usage].map((size) => `${imageUrl(image, size, format)} ${IMAGE_WIDTHS[size]}w`).join(", ");
}

/** Variante par défaut (src de repli) pour un usage. */
export function defaultSize(usage: ImageUsage): ImageSize {
  const sizes = USAGE_SIZES[usage];
  return sizes[sizes.length - 1]!;
}
