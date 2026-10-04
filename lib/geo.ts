import type { BBox, LatLng } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Arrondit une position avant tout envoi au serveur (confidentialité, SPEC §9).
 * 2 décimales ≈ 1,1 km en latitude : suffisant pour classer par distance,
 * insuffisant pour localiser précisément quelqu'un.
 */
export const PRIVACY_DECIMALS = 2;

export function roundCoord(value: number, decimals = PRIVACY_DECIMALS): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function roundLatLng(p: LatLng, decimals = PRIVACY_DECIMALS): LatLng {
  return { lat: roundCoord(p.lat, decimals), lng: roundCoord(p.lng, decimals) };
}

export function inBBox(p: LatLng, [w, s, e, n]: BBox): boolean {
  return p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n;
}

export function bboxCenter([w, s, e, n]: BBox): LatLng {
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
}

export function isValidLatLng(p: Partial<LatLng> | null | undefined): p is LatLng {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

export function parseBBox(value: string | null | undefined): BBox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [w, s, e, n] = parts as [number, number, number, number];
  if (w >= e || s >= n) return null;
  return [w, s, e, n];
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}
