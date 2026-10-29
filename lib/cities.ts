import type { CountryCode } from "./countries";

export interface City {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  country: CountryCode;
  /** Variantes normalisées reconnues par la recherche. */
  aliases: string[];
}

export const CITIES: City[] = [
  { slug: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, country: "FR", aliases: ["paris", "pantin", "montreuil"] },
  { slug: "nantes", name: "Nantes", lat: 47.2184, lng: -1.5536, country: "FR", aliases: ["nantes"] },
  { slug: "lyon", name: "Lyon", lat: 45.764, lng: 4.8357, country: "FR", aliases: ["lyon", "villeurbanne"] },
  { slug: "bordeaux", name: "Bordeaux", lat: 44.8378, lng: -0.5792, country: "FR", aliases: ["bordeaux"] },
  { slug: "marseille", name: "Marseille", lat: 43.2965, lng: 5.3698, country: "FR", aliases: ["marseille"] },
  { slug: "lille", name: "Lille", lat: 50.6292, lng: 3.0573, country: "FR", aliases: ["lille", "roubaix"] },
  { slug: "rennes", name: "Rennes", lat: 48.1173, lng: -1.6778, country: "FR", aliases: ["rennes"] },
  { slug: "toulouse", name: "Toulouse", lat: 43.6047, lng: 1.4442, country: "FR", aliases: ["toulouse"] },
  // Belgique (Bruxelles et Wallonie)
  {
    slug: "bruxelles",
    name: "Bruxelles",
    lat: 50.8503,
    lng: 4.3517,
    country: "BE",
    aliases: ["bruxelles", "brussel", "brussels", "ixelles", "saint gilles", "schaerbeek", "etterbeek", "anderlecht", "uccle"],
  },
  { slug: "liege", name: "Liège", lat: 50.6326, lng: 5.5797, country: "BE", aliases: ["liege"] },
  { slug: "charleroi", name: "Charleroi", lat: 50.4108, lng: 4.4446, country: "BE", aliases: ["charleroi"] },
  { slug: "namur", name: "Namur", lat: 50.4674, lng: 4.872, country: "BE", aliases: ["namur"] },
  { slug: "mons", name: "Mons", lat: 50.4542, lng: 3.9567, country: "BE", aliases: ["mons"] },
];

export const DEFAULT_CENTER = { lat: 47.4, lng: 2.8 }; // France et Belgique
export const DEFAULT_ZOOM = 5;
export const CITY_ZOOM = 12;
export const CITY_RADIUS_KM = 20;

export function cityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}
