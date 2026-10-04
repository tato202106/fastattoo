import type { Artist, ArtistCard, SearchQuery, SearchResponse, Suggestion } from "../types";

/**
 * Accès aux tatoueurs. L'UI et les routes API ne dépendent que de cette
 * interface : la remplacer par une implémentation base de données (Postgres +
 * PostGIS, par ex.) ne demande aucun changement côté interface.
 */
export interface ArtistRepository {
  search(query: SearchQuery): Promise<SearchResponse>;
  getBySlug(slug: string): Promise<Artist | null>;
  getById(id: string): Promise<Artist | null>;
  getCards(ids: string[]): Promise<ArtistCard[]>;
  featured(limit: number): Promise<ArtistCard[]>;
  suggest(q: string, limit?: number): Promise<Suggestion[]>;
  /** Slugs pour la génération statique / sitemap. */
  allSlugs(): Promise<string[]>;
}
