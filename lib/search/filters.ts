/**
 * Filtres de recherche et (dé)sérialisation dans l'URL.
 * La position de l'utilisateur n'est JAMAIS mise dans l'URL (SPEC §9) :
 * elle ne transite que dans les requêtes API, arrondie.
 */
import { parseBBox } from "../geo";
import { isStyleSlug } from "../styles";
import type { Availability, BBox, SearchFilters } from "../types";

export const RADIUS_MIN = 5;
export const RADIUS_MAX = 100;
export const DEFAULT_RADIUS = 25;
export const RATING_OPTIONS = [4, 4.5, 4.8] as const;
export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois-ci" },
];

export const DEFAULT_FILTERS: SearchFilters = {
  styles: [],
  radiusKm: DEFAULT_RADIUS,
  priceMin: null,
  priceMax: null,
  availability: null,
  ratingMin: null,
};

export function countActiveFilters(f: SearchFilters): number {
  let n = f.styles.length;
  if (f.radiusKm !== DEFAULT_RADIUS) n++;
  if (f.priceMin != null || f.priceMax != null) n++;
  if (f.availability) n++;
  if (f.ratingMin != null) n++;
  return n;
}

function num(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function filtersFromParams(params: URLSearchParams): SearchFilters {
  const styles = (params.get("styles") ?? "")
    .split(",")
    .filter(Boolean)
    .filter(isStyleSlug);
  const radius = num(params.get("radius"));
  const availability = params.get("dispo");
  const rating = num(params.get("note"));
  return {
    styles: [...new Set(styles)],
    radiusKm: radius == null ? DEFAULT_RADIUS : clamp(Math.round(radius), RADIUS_MIN, RADIUS_MAX),
    priceMin: num(params.get("prixMin")),
    priceMax: num(params.get("prixMax")),
    availability: availability === "today" || availability === "week" || availability === "month" ? availability : null,
    ratingMin: rating != null && (RATING_OPTIONS as readonly number[]).includes(rating) ? rating : null,
  };
}

/** Écrit les filtres dans des paramètres d'URL (seulement ce qui diffère des valeurs par défaut). */
export function filtersToParams(f: SearchFilters, params = new URLSearchParams()): URLSearchParams {
  const set = (k: string, v: string | null) => (v ? params.set(k, v) : params.delete(k));
  set("styles", f.styles.join(","));
  set("radius", f.radiusKm !== DEFAULT_RADIUS ? String(f.radiusKm) : null);
  set("prixMin", f.priceMin != null ? String(f.priceMin) : null);
  set("prixMax", f.priceMax != null ? String(f.priceMax) : null);
  set("dispo", f.availability);
  set("note", f.ratingMin != null ? String(f.ratingMin) : null);
  return params;
}

export function bboxToParam(b: BBox): string {
  return b.map((n) => n.toFixed(4)).join(",");
}

export { parseBBox };
