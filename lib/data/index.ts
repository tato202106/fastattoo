import { MemoryArtistRepository } from "./memory";
import type { ArtistRepository } from "./repository";

/** Point d'entrée unique : remplacer ici par l'implémentation base de données. */
export const artists: ArtistRepository = new MemoryArtistRepository();

export type { ArtistRepository };
