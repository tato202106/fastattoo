import "server-only";

/**
 * Géocodage d'une adresse française (Géoplateforme IGN, gratuit, sans clé),
 * pour placer le tatoueur sur la carte. Renvoie null si rien n'est trouvé.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
}

const ENDPOINTS = ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"];

interface Feature {
  geometry?: { coordinates?: [number, number] };
  properties?: { city?: string; name?: string; score?: number; type?: string };
}

async function query(q: string, municipality: boolean): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ q, limit: "1" });
  if (municipality) params.set("type", "municipality");
  for (const base of ENDPOINTS) {
    try {
      const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as { features?: Feature[] };
      const f = data.features?.[0];
      const [lng, lat] = f?.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number" || (f?.properties?.score ?? 0) < 0.35) return null;
      return { lat, lng, city: f?.properties?.city || f?.properties?.name || "" };
    } catch {
      // service suivant
    }
  }
  return null;
}

/** Adresse complète d'abord (précis), sinon la ville seule. */
export async function geocode(address: string, city: string): Promise<GeocodeResult | null> {
  if (address) {
    const precise = await query(`${address} ${city}`.trim(), false);
    if (precise) return precise;
  }
  return city ? query(city, true) : null;
}
