import type { ImageAsset, StyleSlug } from "../types";
import { artSpec } from "./generate";

/** Image générée (démo) pour un style et une graine. */
export function artAsset(style: StyleSlug, seed: number, alt: string): ImageAsset {
  const s = artSpec(style, seed);
  return { id: `${style}-${seed}`, base: `/media/art/${style}/${seed}`, width: s.width, height: s.height, color: s.background, alt };
}

/** Avatar généré (initiales) d'un tatoueur de démo. */
export function avatarAsset(n: number, name: string): ImageAsset {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { id: `avatar-${n}`, base: `/media/avatar/${n}/${encodeURIComponent(initials)}`, width: 400, height: 400, color: "#2d2a32", alt: name };
}
