import { MemoryArtistRepository } from "./memory";
import { NeonArtistRepository } from "./neon";
import type { ArtistRepository } from "./repository";

/** Si DATABASE_URL existe, on utilise Neon. Sinon, les données de démo en mémoire. */
export const artists: ArtistRepository = process.env.DATABASE_URL
  ? new NeonArtistRepository()
  : new MemoryArtistRepository();

export type { ArtistRepository };