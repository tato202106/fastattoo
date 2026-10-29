/**
 * Lecture des réponses des services de géocodage (logique pure, testée).
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
}

/** Résultat Nominatim (format jsonv2, avec addressdetails=1). */
export interface NominatimPlace {
  lat?: string;
  lon?: string;
  name?: string;
  address?: Partial<Record<"city" | "town" | "village" | "municipality" | "city_district" | "suburb", string>>;
}

/** Bruxelles : OpenStreetMap donne souvent le nom bilingue (« Bruxelles - Brussel »). */
function frenchName(name: string): string {
  return name.split(/\s+-\s+/)[0]?.trim() ?? name.trim();
}

/** Premier résultat Nominatim → coordonnées et ville, ou null s'il est inutilisable. */
export function fromNominatim(places: NominatimPlace[] | null | undefined): GeocodeResult | null {
  const p = Array.isArray(places) ? places[0] : undefined;
  if (!p) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || p.lat === undefined || p.lon === undefined) return null;
  const a = p.address ?? {};
  const city = a.city || a.town || a.village || a.municipality || p.name || "";
  return { lat, lng, city: frenchName(city) };
}
