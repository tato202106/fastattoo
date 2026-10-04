import { isValidLatLng, parseBBox, roundLatLng } from "../geo";
import type { SearchQuery } from "../types";
import { filtersFromParams } from "./filters";

/** Construit une SearchQuery à partir des paramètres de /api/artists/search. */
export function searchQueryFromParams(params: URLSearchParams): SearchQuery {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const hasCenter = params.has("lat") && params.has("lng") && isValidLatLng({ lat, lng });
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 12);
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    // Arrondi aussi côté serveur : on ne manipule jamais une position précise.
    center: hasCenter ? roundLatLng({ lat, lng }) : null,
    bbox: parseBBox(params.get("bbox")),
    filters: filtersFromParams(params),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    pageSize: Number.isFinite(pageSize) && pageSize >= 0 ? Math.floor(pageSize) : 12,
  };
}
