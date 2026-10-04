/**
 * Moteur de recherche pur (sans I/O) appliqué à une liste de tatoueurs.
 * Utilisé par le repository en mémoire ; une implémentation SQL/PostGIS
 * devra reproduire les mêmes règles (couvertes par les tests unitaires).
 */
import { CITY_RADIUS_KM } from "../cities";
import { diffDays, todayISO } from "../dates";
import { bboxCenter, haversineKm, inBBox } from "../geo";
import type { Artist, ArtistCard, LatLng, SearchQuery, SearchResponse } from "../types";
import { nameScore, parseQuery } from "./parse";

export const MAX_MARKERS = 200;
export const MAX_PAGE_SIZE = 50;

export function toCard(a: Artist, distanceKm: number | null): ArtistCard {
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    title: a.title,
    city: a.city,
    lat: a.lat,
    lng: a.lng,
    rating: a.rating,
    reviewCount: a.reviewCount,
    verified: a.verified,
    styles: a.styles,
    priceFrom: a.priceFrom,
    avatar: a.avatar,
    previews: a.portfolio.slice(0, 3).map(({ id, base, width, height, color, alt }) => ({ id, base, width, height, color, alt })),
    nextSlot: a.nextSlots[0] ?? null,
    distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
  };
}

const AVAILABILITY_DAYS = { today: 0, week: 6, month: 30 } as const;

/** Score de popularité : note pondérée par le nombre d'avis (bayésien simple). */
function popularity(a: Artist): number {
  const prior = 4.5;
  const weight = 20;
  return (a.rating * a.reviewCount + prior * weight) / (a.reviewCount + weight);
}

export function searchArtists(artists: Artist[], query: SearchQuery, today = todayISO()): SearchResponse {
  const parsed = parseQuery(query.q ?? "", artists.flatMap((a) => [a.name, a.studio]));
  const { filters } = query;
  const styles = [...new Set([...filters.styles, ...parsed.styles])];

  // Zone géographique : zone de carte > ville tapée > position (rayon) > partout.
  const cityCenter: LatLng | null = parsed.city ? { lat: parsed.city.lat, lng: parsed.city.lng } : null;
  let area: { kind: "bbox" } | { kind: "radius"; center: LatLng; km: number } | null = null;
  if (query.bbox) area = { kind: "bbox" };
  else if (cityCenter) area = { kind: "radius", center: cityCenter, km: Math.max(filters.radiusKm, CITY_RADIUS_KM) };
  else if (query.center) area = { kind: "radius", center: query.center, km: filters.radiusKm };

  // Référence pour afficher la distance : la position de l'utilisateur en priorité.
  const distanceRef: LatLng | null = query.center ?? cityCenter ?? (query.bbox ? bboxCenter(query.bbox) : null);

  const scored: { artist: Artist; distance: number | null; score: number }[] = [];
  for (const a of artists) {
    const p = { lat: a.lat, lng: a.lng };
    if (area?.kind === "bbox" && !inBBox(p, query.bbox!)) continue;
    if (area?.kind === "radius" && haversineKm(area.center, p) > area.km) continue;
    if (styles.length && !a.styles.some((s) => styles.includes(s))) continue;
    if (filters.priceMin != null && a.priceFrom < filters.priceMin) continue;
    if (filters.priceMax != null && a.priceFrom > filters.priceMax) continue;
    if (filters.ratingMin != null && a.rating < filters.ratingMin) continue;
    if (filters.availability) {
      const next = a.nextSlots[0];
      if (!next || diffDays(today, next.date) > AVAILABILITY_DAYS[filters.availability]) continue;
    }
    let score = 0;
    if (parsed.text) {
      score = nameScore(parsed.text, a.name, a.studio);
      if (score === 0) continue;
    }
    scored.push({ artist: a, distance: distanceRef ? haversineKm(distanceRef, p) : null, score });
  }

  scored.sort((x, y) => {
    if (x.score !== y.score) return y.score - x.score;
    if (x.distance != null && y.distance != null && area) return x.distance - y.distance;
    return popularity(y.artist) - popularity(x.artist);
  });

  const pageSize = Math.min(Math.max(query.pageSize, 0), MAX_PAGE_SIZE);
  const page = Math.max(1, query.page);
  const cards = scored.map((s) => toCard(s.artist, s.distance));
  const start = (page - 1) * pageSize;

  return {
    total: cards.length,
    page,
    pageSize,
    hasMore: start + pageSize < cards.length,
    markers: cards.slice(0, MAX_MARKERS).map((c) => ({ ...c, previews: [] })),
    items: cards.slice(start, start + pageSize),
    center: area?.kind === "radius" ? area.center : query.bbox ? bboxCenter(query.bbox) : null,
    radiusKm: area?.kind === "radius" ? area.km : null,
    parsed,
  };
}
