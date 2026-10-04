"use client";

import { roundLatLng } from "../geo";
import type { BBox, LatLng, SearchFilters, SearchResponse } from "../types";
import { bboxToParam, filtersToParams } from "./filters";

export interface ClientSearch {
  q?: string;
  center?: LatLng | null;
  bbox?: BBox | null;
  filters: SearchFilters;
  page?: number;
  pageSize?: number;
}

/** Appel de /api/artists/search. La position est arrondie avant envoi (SPEC §9). */
export async function fetchSearch(s: ClientSearch, signal?: AbortSignal): Promise<SearchResponse> {
  const params = filtersToParams(s.filters);
  if (s.q) params.set("q", s.q);
  if (s.center) {
    const p = roundLatLng(s.center);
    params.set("lat", String(p.lat));
    params.set("lng", String(p.lng));
  }
  if (s.bbox) params.set("bbox", bboxToParam(s.bbox));
  params.set("page", String(s.page ?? 1));
  params.set("pageSize", String(s.pageSize ?? 12));
  const res = await fetch(`/api/artists/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Recherche impossible (${res.status})`);
  return (await res.json()) as SearchResponse;
}
