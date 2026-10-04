import type { BodyZone, StyleSlug } from "./types";

export interface StyleDef {
  slug: StyleSlug;
  label: string;
  /** Variantes d'écriture reconnues par la recherche (déjà normalisées). */
  synonyms: string[];
  description: string;
}

/** Les 6 premiers sont ceux mis en avant sur la homepage (SPEC §5). */
export const STYLES: StyleDef[] = [
  { slug: "fine-line", label: "Fine Line", synonyms: ["fine line", "fineline", "fin", "trait fin", "line"], description: "Traits fins et délicats" },
  { slug: "blackwork", label: "Blackwork", synonyms: ["blackwork", "black work", "noir", "black"], description: "Aplats noirs et motifs graphiques" },
  { slug: "realisme", label: "Réalisme", synonyms: ["realisme", "realiste", "realism", "realistic", "portrait"], description: "Portraits et ombrages réalistes" },
  { slug: "japonais", label: "Japonais", synonyms: ["japonais", "japanese", "irezumi", "japon"], description: "Vagues, koï et tradition japonaise" },
  { slug: "old-school", label: "Old School", synonyms: ["old school", "oldschool", "traditionnel", "traditional", "american"], description: "Contours épais, couleurs franches" },
  { slug: "floral", label: "Floral", synonyms: ["floral", "fleur", "fleurs", "botanique", "flower"], description: "Fleurs et compositions végétales" },
  { slug: "minimaliste", label: "Minimaliste", synonyms: ["minimaliste", "minimal", "minimalist", "mini"], description: "Petits motifs épurés" },
  { slug: "geometrique", label: "Géométrique", synonyms: ["geometrique", "geometric", "geometrie", "geo"], description: "Formes et symétries" },
  { slug: "aquarelle", label: "Aquarelle", synonyms: ["aquarelle", "watercolor", "watercolour"], description: "Couleurs diluées et éclaboussures" },
  { slug: "dotwork", label: "Dotwork", synonyms: ["dotwork", "dot work", "points", "pointillisme", "mandala"], description: "Ombrages en points, mandalas" },
];

export const FEATURED_STYLES = STYLES.slice(0, 6);

const BY_SLUG = new Map(STYLES.map((s) => [s.slug, s]));

export function styleLabel(slug: StyleSlug): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

export function isStyleSlug(value: string): value is StyleSlug {
  return BY_SLUG.has(value as StyleSlug);
}

export const BODY_ZONES: { slug: BodyZone; label: string }[] = [
  { slug: "avant-bras", label: "Avant-bras" },
  { slug: "bras", label: "Bras" },
  { slug: "epaule", label: "Épaule" },
  { slug: "dos", label: "Dos" },
  { slug: "poitrine", label: "Poitrine" },
  { slug: "cote", label: "Côtes" },
  { slug: "jambe", label: "Jambe" },
  { slug: "cheville", label: "Cheville" },
  { slug: "main", label: "Main" },
  { slug: "nuque", label: "Nuque" },
];

export function zoneLabel(slug: BodyZone): string {
  return BODY_ZONES.find((z) => z.slug === slug)?.label ?? slug;
}
