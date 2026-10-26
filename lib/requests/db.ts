import "server-only";
import { neon } from "@neondatabase/serverless";
import { ensureAccountTables } from "../accounts/db";
import type { ImageAsset, StyleSlug } from "../types";
import type { NewRequest, RequestMessage, RequestStatus, RequestThread, Sender } from "./model";

/**
 * Demandes de projet et messages dans Neon. Tables créées au premier usage :
 * - project_requests : la demande du client, liée au compte du tatoueur ;
 *   le client y accède par un lien privé (jeton aléatoire de 256 bits, renvoyé dans les e-mails) ;
 * - request_messages : les échanges (texte et propositions de rendez-vous).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return neon(url);
};

let ready: Promise<void> | null = null;

export function ensureRequestTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureAccountTables();
      const sql = connect();
      await sql`CREATE TABLE IF NOT EXISTS project_requests (
        id serial PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        artist_id text NOT NULL,
        client_token text NOT NULL UNIQUE,
        client_name text NOT NULL,
        client_email text NOT NULL,
        client_phone text NOT NULL DEFAULT '',
        description text NOT NULL,
        styles text[] NOT NULL DEFAULT '{}',
        zone text NOT NULL,
        size text NOT NULL,
        budget_min integer NOT NULL,
        budget_max integer NOT NULL,
        dates text[] NOT NULL DEFAULT '{}',
        inspirations jsonb NOT NULL DEFAULT '[]',
        status text NOT NULL DEFAULT 'new',
        artist_read_at timestamptz,
        client_read_at timestamptz
      )`;
      await sql`CREATE INDEX IF NOT EXISTS project_requests_account ON project_requests (account_id, updated_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS request_messages (
        id serial PRIMARY KEY,
        request_id integer NOT NULL REFERENCES project_requests(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        sender text NOT NULL,
        body text NOT NULL DEFAULT '',
        slot_date text,
        slot_time text
      )`;
      await sql`CREATE INDEX IF NOT EXISTS request_messages_request ON request_messages (request_id, id)`;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

/** Tatoueur destinataire : compte publié et abonnement actif. */
export async function recipientFor(accountId: number): Promise<{ email: string; name: string; artistId: string; slug: string } | null> {
  await ensureRequestTables();
  const rows = (await connect()`SELECT a.email, a.name, a.artist_id, a.subscription_status, ar.slug
    FROM artist_accounts a LEFT JOIN artists ar ON ar.id = a.artist_id
    WHERE a.id = ${accountId} AND a.profile_status = 'published'`) as Row[];
  const r = rows[0];
  if (!r?.artist_id) return null;
  return { email: r.email, name: r.name || "le tatoueur", artistId: r.artist_id, slug: r.slug ?? "" };
}

export async function createRequest(accountId: number, r: NewRequest, clientToken: string): Promise<number> {
  await ensureRequestTables();
  const rows = (await connect()`INSERT INTO project_requests
      (account_id, artist_id, client_token, client_name, client_email, client_phone, description, styles, zone, size, budget_min, budget_max, dates, inspirations, client_read_at)
    VALUES (${accountId}, ${r.artistId}, ${clientToken}, ${r.clientName}, ${r.clientEmail}, ${r.clientPhone}, ${r.description}, ${r.styles},
      ${r.zone}, ${r.size}, ${r.budgetMin}, ${r.budgetMax}, ${r.dates}, ${JSON.stringify(r.inspirations)}::jsonb, now())
    RETURNING id`) as Row[];
  return rows[0]!.id as number;
}

function toMessage(m: Row): RequestMessage {
  return { id: m.id, at: iso(m.created_at), from: m.sender as Sender, body: m.body ?? "", slot: m.slot_date && m.slot_time ? { date: m.slot_date, time: m.slot_time } : null };
}

async function thread(r: Row, viewer: Sender): Promise<RequestThread> {
  const messages = ((await connect()`SELECT * FROM request_messages WHERE request_id = ${r.id} ORDER BY id`) as Row[]).map(toMessage);
  const readAt = viewer === "artist" ? r.artist_read_at : r.client_read_at;
  const other: Sender = viewer === "artist" ? "client" : "artist";
  const unreadMessages = messages.filter((m) => m.from === other && (!readAt || new Date(m.at) > new Date(readAt))).length;
  // Pour le tatoueur, la demande elle-même compte comme non lue tant qu'il ne l'a pas ouverte.
  const unread = unreadMessages + (viewer === "artist" && !r.artist_read_at ? 1 : 0);
  return {
    id: r.id,
    createdAt: iso(r.created_at),
    status: r.status as RequestStatus,
    artistId: r.artist_id,
    artistName: r.artist_name ?? "",
    artistSlug: r.artist_slug ?? "",
    clientName: r.client_name,
    clientPhone: r.client_phone ?? "",
    description: r.description,
    styles: (r.styles ?? []) as StyleSlug[],
    zone: r.zone,
    size: r.size,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    dates: r.dates ?? [],
    inspirations: (r.inspirations ?? []) as ImageAsset[],
    messages,
    unread,
  };
}

/** Conversation vue par le client (lien privé). */
export async function threadForClient(token: string): Promise<(RequestThread & { accountId: number; artistEmail: string }) | null> {
  await ensureRequestTables();
  const rows = (await connect()`SELECT p.*, a.name AS artist_name, a.email AS artist_email, ar.slug AS artist_slug
    FROM project_requests p JOIN artist_accounts a ON a.id = p.account_id LEFT JOIN artists ar ON ar.id = p.artist_id
    WHERE p.client_token = ${token}`) as Row[];
  const r = rows[0];
  if (!r) return null;
  return { ...(await thread(r, "client")), accountId: r.account_id, artistEmail: r.artist_email };
}

/** Conversation vue par le tatoueur connecté. */
export async function threadForArtist(accountId: number, id: number): Promise<(RequestThread & { clientEmail: string; clientToken: string }) | null> {
  await ensureRequestTables();
  const rows = (await connect()`SELECT p.*, a.name AS artist_name, ar.slug AS artist_slug
    FROM project_requests p JOIN artist_accounts a ON a.id = p.account_id LEFT JOIN artists ar ON ar.id = p.artist_id
    WHERE p.id = ${id} AND p.account_id = ${accountId}`) as Row[];
  const r = rows[0];
  if (!r) return null;
  return { ...(await thread(r, "artist")), clientEmail: r.client_email, clientToken: r.client_token };
}

export interface InboxItem {
  id: number;
  updatedAt: string;
  status: RequestStatus;
  clientName: string;
  description: string;
  lastMessage: string;
  unread: boolean;
}

/** Boîte de réception du tatoueur. */
export async function inboxFor(accountId: number): Promise<InboxItem[]> {
  await ensureRequestTables();
  const rows = (await connect()`SELECT p.id, p.updated_at, p.status, p.client_name, p.description, p.artist_read_at,
      (SELECT body FROM request_messages m WHERE m.request_id = p.id ORDER BY m.id DESC LIMIT 1) AS last_body,
      (SELECT max(created_at) FROM request_messages m WHERE m.request_id = p.id AND m.sender = 'client') AS last_client_at
    FROM project_requests p WHERE p.account_id = ${accountId} ORDER BY p.updated_at DESC LIMIT 200`) as Row[];
  return rows.map((r) => ({
    id: r.id,
    updatedAt: iso(r.updated_at),
    status: r.status,
    clientName: r.client_name,
    description: r.description,
    lastMessage: r.last_body ?? "",
    unread: !r.artist_read_at || (r.last_client_at != null && new Date(r.last_client_at) > new Date(r.artist_read_at)),
  }));
}

export async function unreadCountFor(accountId: number): Promise<number> {
  return (await inboxFor(accountId)).filter((i) => i.unread).length;
}

export async function markRead(id: number, viewer: Sender): Promise<void> {
  const sql = connect();
  if (viewer === "artist") await sql`UPDATE project_requests SET artist_read_at = now() WHERE id = ${id}`;
  else await sql`UPDATE project_requests SET client_read_at = now() WHERE id = ${id}`;
}

/** Ajoute un message et met à jour le statut de la demande. */
export async function addMessage(id: number, from: Sender, text: string, slot: { date: string; time: string } | null, status?: RequestStatus): Promise<void> {
  const sql = connect();
  await sql`INSERT INTO request_messages (request_id, sender, body, slot_date, slot_time) VALUES (${id}, ${from}, ${text}, ${slot?.date ?? null}, ${slot?.time ?? null})`;
  if (from === "artist") {
    await sql`UPDATE project_requests SET updated_at = now(), artist_read_at = now(), status = ${status ?? "replied"} WHERE id = ${id}`;
  } else if (status) {
    await sql`UPDATE project_requests SET updated_at = now(), client_read_at = now(), status = ${status} WHERE id = ${id}`;
  } else {
    await sql`UPDATE project_requests SET updated_at = now(), client_read_at = now() WHERE id = ${id}`;
  }
}

/** Change le statut d'une demande (ex. : le tatoueur la décline). */
export async function setStatus(id: number, status: RequestStatus): Promise<void> {
  await connect()`UPDATE project_requests SET status = ${status}, updated_at = now() WHERE id = ${id}`;
}
