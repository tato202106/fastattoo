import { artAsset } from "./art/assets";
import type { TattooSize } from "./store/model";
import { isStyleSlug, styleLabel } from "./styles";
import type { ImageAsset, StyleSlug } from "./types";

/**
 * Flashs : dessins déjà prêts que le tatoueur propose à prix fixe.
 * Le client choisit un flash sur le profil et envoie une demande pré-remplie.
 */

export type FlashStatus = "available" | "reserved" | "done";

export interface Flash {
  id: string;
  image: ImageAsset;
  title: string;
  /** Prix fixe en euros. */
  price: number;
  size: TattooSize;
  style: StyleSlug;
  /** Pièce unique (« one shot ») : tatouée une seule fois. */
  unique: boolean;
  status: FlashStatus;
}

export const MAX_FLASHES = 40;
export const FLASH_PRICE_MIN = 20;
export const FLASH_PRICE_MAX = 3000;

export const FLASH_STATUS_LABEL: Record<FlashStatus, string> = {
  available: "Disponible",
  reserved: "Réservé",
  done: "Déjà tatoué",
};

export const FLASH_SIZE_LABEL: Record<TattooSize, string> = {
  small: "Petit (moins de 5 cm)",
  medium: "Moyen (5 à 15 cm)",
  large: "Grand (plus de 15 cm)",
};

const SIZES = new Set<string>(["small", "medium", "large"]);
const STATUSES = new Set<string>(["available", "reserved", "done"]);

export function isFlashStatus(v: unknown): v is FlashStatus {
  return typeof v === "string" && STATUSES.has(v);
}

export type FlashInput = { title: string; price: number; size: TattooSize; style: StyleSlug; unique: boolean };

/** Valide les champs d'un flash envoyés par le tatoueur. */
export function parseFlashInput(
  raw: Record<string, unknown>,
  fallbackStyle: StyleSlug,
): { ok: true; value: FlashInput } | { ok: false; error: string } {
  const title = typeof raw.title === "string" ? raw.title.trim().replace(/\s+/g, " ") : "";
  if (title.length < 2 || title.length > 60) return { ok: false, error: "Donne un nom à ton flash (2 à 60 caractères)." };
  const price = Math.round(Number(raw.price));
  if (!Number.isFinite(price) || price < FLASH_PRICE_MIN || price > FLASH_PRICE_MAX) {
    return { ok: false, error: `Indique un prix entre ${FLASH_PRICE_MIN} et ${FLASH_PRICE_MAX} €.` };
  }
  const size = typeof raw.size === "string" && SIZES.has(raw.size) ? (raw.size as TattooSize) : "small";
  const style = typeof raw.style === "string" && isStyleSlug(raw.style) ? raw.style : fallbackStyle;
  const unique = raw.unique === true || raw.unique === "true" || raw.unique === "1" || raw.unique === "on";
  return { ok: true, value: { title, price, size, style, unique } };
}

/** Flashs montrés aux clients : disponibles d'abord, puis réservés ; les flashs déjà tatoués sont cachés. */
export function publicFlashes(list: Flash[]): Flash[] {
  return list.filter((f) => f.status !== "done").sort((a, b) => Number(a.status === "reserved") - Number(b.status === "reserved"));
}

/** Seuls les flashs disponibles peuvent être demandés. */
export function canRequestFlash(f: Pick<Flash, "status">): boolean {
  return f.status === "available";
}

/** Texte de départ de la demande de projet faite à partir d'un flash. */
export function flashRequestDescription(f: Pick<Flash, "title" | "price" | "unique">): string {
  return `Je voudrais ton flash « ${f.title} » (${f.price} €${f.unique ? ", pièce unique" : ""}).`;
}

const DEMO_TITLES: Partial<Record<StyleSlug, string[]>> = {
  "fine-line": ["Brin de lavande", "Petite hirondelle", "Lune et étoiles"],
  floral: ["Pivoine", "Bouquet sauvage", "Rose ouverte"],
  "old-school": ["Cœur et dague", "Hirondelle", "Ancre marine"],
  japonais: ["Vague", "Carpe koï", "Fleur de cerisier"],
  minimaliste: ["Ligne d'horizon", "Petit soleil", "Montagne"],
  geometrique: ["Losange sacré", "Triangle", "Hexagone"],
  blackwork: ["Serpent", "Papillon de nuit", "Crâne"],
  realisme: ["Œil", "Portrait d'animal", "Rose"],
  aquarelle: ["Colibri", "Fleur aquarelle", "Plume"],
  dotwork: ["Mandala", "Lune en points", "Fleur de vie"],
};

/** Flashs d'exemple pour les profils de démonstration (dessins générés, toujours les mêmes pour un profil). */
export function demoFlashes(a: { id: string; styles: StyleSlug[]; priceFrom: number }): Flash[] {
  const seed = [...a.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 100000, 7);
  const styles = a.styles.length ? a.styles : (["fine-line"] as StyleSlug[]);
  const base = Math.max(60, a.priceFrom || 80);
  const sizes: TattooSize[] = ["small", "small", "medium", "medium"];
  return sizes.map((size, i) => {
    const style = styles[i % styles.length]!;
    const titles = DEMO_TITLES[style] ?? [styleLabel(style)];
    const title = titles[(seed + i) % titles.length]!;
    return {
      id: `demo-${i}`,
      image: artAsset(style, 20000 + ((seed + i * 97) % 5000), `Flash ${title}`),
      title,
      price: Math.round((base + (size === "medium" ? 70 : 0) + i * 10) / 10) * 10,
      size,
      style,
      unique: i % 2 === 1,
      status: i === 3 ? "reserved" : "available",
    };
  });
}
