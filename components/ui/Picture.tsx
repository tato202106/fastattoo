import clsx from "clsx";
import { defaultSize, imageUrl, srcSet, type ImageUsage } from "@/lib/images";
import type { ImageAsset } from "@/lib/types";

/**
 * Image responsive : AVIF + WebP via <picture>, variante choisie selon l'usage
 * (liste → thumbnail, profil → medium, plein écran → large), lazy loading,
 * dimensions fixes (pas de layout shift) et couleur dominante en placeholder.
 *
 * Pas de fondu piloté par JS : l'image s'affiche dès qu'elle est décodée,
 * même avant l'hydratation (sinon le LCP attendrait le JavaScript).
 */
export function Picture({
  image,
  usage,
  sizes,
  priority = false,
  className,
  imgClassName,
  fill = false,
  alt,
  draggable,
}: {
  image: ImageAsset;
  usage: ImageUsage;
  /** Attribut sizes ; par défaut calculé selon l'usage. */
  sizes?: string;
  /** Image principale de l'écran (LCP) : chargement immédiat et prioritaire. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Remplit le parent (object-cover) au lieu de respecter le ratio. */
  fill?: boolean;
  alt?: string;
  draggable?: boolean;
}) {
  const sizesAttr = sizes ?? DEFAULT_SIZES[usage];
  return (
    <picture
      className={clsx("block overflow-hidden", fill && "absolute inset-0", className)}
      style={{ backgroundColor: image.color, aspectRatio: fill ? undefined : `${image.width} / ${image.height}` }}
    >
      <source type="image/avif" srcSet={srcSet(image, usage, "avif")} sizes={sizesAttr} />
      <source type="image/webp" srcSet={srcSet(image, usage, "webp")} sizes={sizesAttr} />
      <img
        src={imageUrl(image, defaultSize(usage), "webp")}
        width={image.width}
        height={image.height}
        alt={alt ?? image.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        draggable={draggable}
        className={clsx("h-full w-full object-cover", imgClassName)}
      />
    </picture>
  );
}

const DEFAULT_SIZES: Record<ImageUsage, string> = {
  list: "(min-width: 1024px) 140px, 33vw",
  avatar: "56px",
  profile: "(min-width: 1024px) 360px, 50vw",
  cover: "(min-width: 1024px) 60vw, 100vw",
  fullscreen: "100vw",
};
