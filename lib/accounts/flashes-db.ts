import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Flash, FlashInput, FlashStatus } from "../flashes";
import { publicFlashes } from "../flashes";
import type { TattooSize } from "../store/model";
import type { ImageAsset, StyleSlug } from "../types";
import { ensureAccountTables } from "./db";

/**
 * Flashs des tatoueurs dans Neon (voir lib/flashes.ts). Table créée au premier usage :
 * account_flashes, une ligne par flash avec son image (envoyée comme les photos
 * du portfolio), son prix fixe et son statut. Le profil public les lit
 * directement (/api/flashs), seulement pour un profil en ligne.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return neon(url);
};

let ready: Promise<void> | null = null;

export function ensureFlashTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureAccountTables();
      await connect()`CREATE TABLE IF NOT EXISTS account_flashes (
        id text PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        position integer NOT NULL DEFAULT 0,
        image jsonb NOT NULL,
        title text NOT NULL,
        price integer NOT NULL,
        size text NOT NULL DEFAULT 'small',
        style text NOT NULL,
        is_unique boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'available',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

function toFlash(r: Row): Flash {
  return {
    id: r.id,
    image: r.image as ImageAsset,
    title: r.title,
    price: Number(r.price),
    size: r.size as TattooSize,
    style: r.style as StyleSlug,
    unique: Boolean(r.is_unique),
    status: r.status as FlashStatus,
  };
}

/** Tous les flashs d'un compte (espace tatoueur), le plus récent en premier. */
export async function listFlashes(accountId: number): Promise<Flash[]> {
  await ensureFlashTable();
  const rows = (await connect()`SELECT * FROM account_flashes WHERE account_id = ${accountId} ORDER BY position, created_at DESC`) as Row[];
  return rows.map(toFlash);
}

/** Flashs visibles par les clients, seulement si le profil est en ligne. */
export async function listPublicFlashes(accountId: number): Promise<Flash[]> {
  await ensureFlashTable();
  const rows = (await connect()`SELECT f.* FROM account_flashes f JOIN artist_accounts a ON a.id = f.account_id
    WHERE f.account_id = ${accountId} AND a.profile_status = 'published' AND f.status <> 'done'
    ORDER BY f.position, f.created_at DESC`) as Row[];
  return publicFlashes(rows.map(toFlash));
}

export async function countFlashes(accountId: number): Promise<number> {
  await ensureFlashTable();
  const rows = (await connect()`SELECT count(*)::int AS n FROM account_flashes WHERE account_id = ${accountId}`) as Row[];
  return rows[0]?.n ?? 0;
}

export async function addFlash(accountId: number, image: ImageAsset, input: FlashInput): Promise<Flash[]> {
  await ensureFlashTable();
  const id = `fl${accountId}-${image.id}`;
  await connect()`INSERT INTO account_flashes (id, account_id, position, image, title, price, size, style, is_unique)
    VALUES (${id}, ${accountId}, (SELECT COALESCE(MIN(position), 0) - 1 FROM account_flashes WHERE account_id = ${accountId}),
      ${JSON.stringify(image)}::jsonb, ${input.title}, ${input.price}, ${input.size}, ${input.style}, ${input.unique})`;
  return listFlashes(accountId);
}

/** Change le statut ou les infos d'un flash du compte. */
export async function updateFlash(accountId: number, id: string, patch: { status?: FlashStatus; input?: FlashInput }): Promise<Flash[]> {
  await ensureFlashTable();
  const sql = connect();
  if (patch.status) {
    await sql`UPDATE account_flashes SET status = ${patch.status}, updated_at = now() WHERE id = ${id} AND account_id = ${accountId}`;
  }
  if (patch.input) {
    const i = patch.input;
    await sql`UPDATE account_flashes SET title = ${i.title}, price = ${i.price}, size = ${i.size}, style = ${i.style}, is_unique = ${i.unique},
      updated_at = now() WHERE id = ${id} AND account_id = ${accountId}`;
  }
  return listFlashes(accountId);
}

export async function deleteFlash(accountId: number, id: string): Promise<Flash[]> {
  await ensureFlashTable();
  await connect()`DELETE FROM account_flashes WHERE id = ${id} AND account_id = ${accountId}`;
  return listFlashes(accountId);
}
