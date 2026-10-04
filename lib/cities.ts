export interface City {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Variantes normalisées reconnues par la recherche. */
  aliases: string[];
}

export const CITIES: City[] = [
  { slug: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, aliases: ["paris", "pantin", "montreuil"] },
  { slug: "nantes", name: "Nantes", lat: 47.2184, lng: -1.5536, aliases: ["nantes"] },
  { slug: "lyon", name: "Lyon", lat: 45.764, lng: 4.8357, aliases: ["lyon", "villeurbanne"] },
  { slug: "bordeaux", name: "Bordeaux", lat: 44.8378, lng: -0.5792, aliases: ["bordeaux"] },
  { slug: "marseille", name: "Marseille", lat: 43.2965, lng: 5.3698, aliases: ["marseille"] },
  { slug: "lille", name: "Lille", lat: 50.6292, lng: 3.0573, aliases: ["lille", "roubaix"] },
  { slug: "rennes", name: "Rennes", lat: 48.1173, lng: -1.6778, aliases: ["rennes"] },
  { slug: "toulouse", name: "Toulouse", lat: 43.6047, lng: 1.4442, aliases: ["toulouse"] },
];

export const DEFAULT_CENTER = { lat: 46.6, lng: 2.4 }; // France entière
export const DEFAULT_ZOOM = 5;
export const CITY_ZOOM = 12;
export const CITY_RADIUS_KM = 20;

export function cityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}
