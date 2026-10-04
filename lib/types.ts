/** Types du domaine partagés entre le serveur (API, données) et le client (UI). */

export type StyleSlug =
  | "fine-line"
  | "blackwork"
  | "realisme"
  | "japonais"
  | "old-school"
  | "floral"
  | "minimaliste"
  | "geometrique"
  | "aquarelle"
  | "dotwork";

export type BodyZone =
  | "avant-bras"
  | "bras"
  | "epaule"
  | "dos"
  | "poitrine"
  | "cote"
  | "jambe"
  | "cheville"
  | "main"
  | "nuque";

export type ImageSize = "thumbnail" | "small" | "medium" | "large" | "original";
export type ImageFormat = "avif" | "webp";

/**
 * Une image servie en plusieurs variantes. L'URL d'une variante est
 * `${base}/${size}.${format}` (voir lib/images.ts).
 */
export interface ImageAsset {
  id: string;
  base: string;
  width: number;
  height: number;
  /** Couleur dominante, utilisée comme placeholder pendant le chargement. */
  color: string;
  alt: string;
}

export interface PortfolioItem extends ImageAsset {
  style: StyleSlug;
  zone: BodyZone;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string; // YYYY-MM-DD
  text: string;
  style?: StyleSlug;
}

export interface Slot {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface Artist {
  id: string;
  slug: string;
  name: string;
  /** "Tatoueuse" / "Tatoueur" / "Artiste tatoueur·se" */
  title: string;
  city: string;
  citySlug: string;
  studio: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  styles: StyleSlug[];
  priceFrom: number;
  hourlyRate: number;
  bio: string;
  avatar: ImageAsset;
  cover: ImageAsset;
  portfolio: PortfolioItem[];
  reviews: Review[];
  nextSlots: Slot[];
  instagram?: string;
  /** Point d'extension Phase 6 (mise en avant payante). Non utilisé pour l'instant. */
  promoted?: boolean;
}

/** Version légère d'un tatoueur pour les listes, la carte et le carrousel. */
export interface ArtistCard {
  id: string;
  slug: string;
  name: string;
  title: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  styles: StyleSlug[];
  priceFrom: number;
  avatar: ImageAsset;
  /** 3 premières images du portfolio (vignettes). */
  previews: ImageAsset[];
  nextSlot: Slot | null;
  distanceKm: number | null;
}

export type Availability = "today" | "week" | "month";

export interface SearchFilters {
  styles: StyleSlug[];
  radiusKm: number;
  priceMin: number | null;
  priceMax: number | null;
  availability: Availability | null;
  ratingMin: number | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** [ouest, sud, est, nord] */
export type BBox = [number, number, number, number];

export interface SearchQuery {
  q?: string;
  center?: LatLng | null;
  bbox?: BBox | null;
  filters: SearchFilters;
  page: number;
  pageSize: number;
}

export interface ParsedQuery {
  raw: string;
  city: { slug: string; name: string; lat: number; lng: number } | null;
  styles: StyleSlug[];
  /** Texte restant qui peut correspondre à un nom de tatoueur ou de studio. */
  text: string;
  /** Mots-clés de catégorie reconnus (ex. « tatoueur », « studio »). */
  categories: string[];
}

export interface SearchResponse {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Tous les résultats, en version minimale, pour la carte et le carrousel. */
  markers: ArtistCard[];
  /** Résultats paginés pour la liste. */
  items: ArtistCard[];
  /** Centre utilisé pour la recherche (ville détectée, position ou zone). */
  center: LatLng | null;
  radiusKm: number | null;
  parsed: ParsedQuery;
}

export type Suggestion =
  | { type: "artist"; label: string; sublabel: string; slug: string; avatar: ImageAsset }
  | { type: "city"; label: string; sublabel: string; slug: string }
  | { type: "style"; label: string; sublabel: string; slug: StyleSlug };
