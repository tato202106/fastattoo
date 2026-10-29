import "server-only";
import { CITIES } from "../cities";
import { DEFAULT_COUNTRY, type CountryCode } from "../countries";
import { normalize } from "../text";
import { fromNominatim, type GeocodeResult, type NominatimPlace } from "./geocode-parse";

/**
 * Géocodage d'une adresse pour placer le tatoueur sur la carte :
 * - France : Géoplateforme IGN (gratuit, sans clé) ;
 * - Belgique : Nominatim (OpenStreetMap, gratuit, sans clé), limité au pays.
 * Renvoie null si rien n'est trouvé.
 */
export type { GeocodeResult } from "./geocode-parse";

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

/**
 * Nominatim (OpenStreetMap) pour les pays hors France. Politique d'usage :
 * un User-Agent qui identifie le site et au plus une requête par seconde,
 * largement respecté ici (une requête à l'enregistrement d'un profil).
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Fastattoo/1.0 (+https://fastattoo.vercel.app)";

async function queryNominatim(q: string, country: CountryCode): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ q, countrycodes: country.toLowerCase(), format: "jsonv2", addressdetails: "1", limit: "1", "accept-language": "fr" });
  try {
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return fromNominatim((await res.json()) as NominatimPlace[]);
  } catch {
    return null;
  }
}

/** Grandes villes connues du site : repli si le service de géocodage ne répond pas. */
function knownCity(city: string): GeocodeResult | null {
  const key = normalize(city);
  const found = key ? CITIES.find((c) => c.aliases.includes(key) || normalize(c.name) === key) : undefined;
  return found ? { lat: found.lat, lng: found.lng, city: found.name } : null;
}

/**
 * Adresse complète d'abord (précis), sinon la ville seule. Chaque pays a son
 * service, pour ne jamais placer un tatoueur dans une commune homonyme d'un
 * autre pays (ex. Mons, en Belgique et en France).
 */
export async function geocode(address: string, city: string, country: CountryCode = DEFAULT_COUNTRY): Promise<GeocodeResult | null> {
  if (country !== "FR") {
    if (address) {
      const precise = await queryNominatim(`${address}, ${city}`.replace(/^,\s*|,\s*$/g, ""), country);
      if (precise) return precise;
    }
    return city ? queryNominatim(city, country) : null;
  }
  if (address) {
    const precise = await query(`${address} ${city}`.trim(), false);
    if (precise) return precise;
  }
  if (!city) return null;
  return (await query(city, true)) ?? knownCity(city);
}
