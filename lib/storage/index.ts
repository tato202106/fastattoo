import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Stockage de fichiers binaires (images uploadées et leurs variantes).
 * Implémentation disque pour le développement ; à remplacer par S3/R2/GCS en
 * production (même interface).
 */
export interface FileStorage {
  get(key: string): Promise<Buffer | null>;
  put(key: string, data: Buffer): Promise<void>;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]*$/;

export class LocalDiskStorage implements FileStorage {
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

let instance: FileStorage | null = null;
export function storage(): FileStorage {
  instance ??= new LocalDiskStorage(path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || ".data/uploads"));
  return instance;
}
