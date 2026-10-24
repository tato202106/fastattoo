import { neon } from "@neondatabase/serverless";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Stockage de fichiers binaires (images uploadées et leurs variantes).
 * Implémentation disque pour le développement ; à remplacer par S3/R2/GCS en
 * production (même interface).
 */
export interface FileStorage {
  get(key: string): Promise<Buffer | null>;
  put(key: string, data: Buffer): Promise<void>;
  /** Conserver les variantes générées (sinon seul le cache HTTP/CDN les garde). */
  readonly cachesVariants: boolean;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]*$/;

export class LocalDiskStorage implements FileStorage {
  readonly cachesVariants = true;
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key) || key.includes("..")) throw new Error(`Clé de stockage invalide : ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Chemin hors du stockage");
    return full;
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
}

/**
 * Stockage dans Neon (table media_files) : persistant sur Vercel sans service
 * supplémentaire. Seuls les originaux y sont gardés ; les variantes, régénérées
 * à la demande, sont servies avec un cache HTTP immuable (CDN).
 */
export class NeonStorage implements FileStorage {
  readonly cachesVariants = false;
  private ready: Promise<void> | null = null;
  constructor(private readonly url: string) {}

  private sql() {
    return neon(this.url);
  }

  private ensure(): Promise<void> {
    this.ready ??= (async () => {
      await this.sql()`CREATE TABLE IF NOT EXISTS media_files (
        key text PRIMARY KEY,
        data bytea NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    })().catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }

  async get(key: string) {
    if (!KEY_PATTERN.test(key)) return null;
    await this.ensure();
    const rows = (await this.sql()`SELECT encode(data, 'base64') AS b64 FROM media_files WHERE key = ${key}`) as { b64: string }[];
    return rows[0] ? Buffer.from(rows[0].b64, "base64") : null;
  }

  async put(key: string, data: Buffer) {
    if (!KEY_PATTERN.test(key) || key.includes("..")) throw new Error(`Clé de stockage invalide : ${key}`);
    await this.ensure();
    await this.sql()`INSERT INTO media_files (key, data) VALUES (${key}, decode(${data.toString("base64")}, 'base64'))
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`;
  }
}

/**
 * Dossier de stockage. Sur Vercel (et autres hébergements serverless), seul le
 * dossier temporaire est accessible en écriture : les fichiers y sont perdus au
 * redémarrage de la fonction. En production, brancher un stockage objet
 * (Vercel Blob, S3, R2…) qui implémente FileStorage.
 */
function uploadRoot(): string {
  if (process.env.UPLOAD_DIR) return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR);
  if (process.env.VERCEL) return path.join(os.tmpdir(), "fastattoo-uploads");
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data/uploads");
}

let instance: FileStorage | null = null;
export function storage(): FileStorage {
  // En production sur Vercel (disque éphémère), les photos vont dans Neon.
  const useDatabase = process.env.DATABASE_URL && !process.env.UPLOAD_DIR && (process.env.VERCEL || process.env.MEDIA_STORAGE === "database");
  instance ??= useDatabase ? new NeonStorage(process.env.DATABASE_URL!) : new LocalDiskStorage(uploadRoot());
  return instance;
}
