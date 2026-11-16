import "server-only";
import { neon } from "@neondatabase/serverless";
import { publicAuthorName, siteReviewId, summarizeRatings, type ReviewInput } from "../reviews";
import { ensureAgendaTable } from "./agenda-db";
import { artistIdFor } from "./profile";

/**
 * Avis des vrais clients dans Neon (voir lib/reviews.ts). Créé au premier usage :
 * - account_reviews : un avis par rendez-vous de l'agenda (agenda_entry_id unique),
 *   avec la réponse publique du tatoueur et un drapeau de modération ;
 * - agenda_entries.review_request_sent_at : e-mail de demande d'avis envoyé.
 * Les avis publiés sont copiés dans la table `reviews` lue par le site, et la
 * note moyenne dans `artists.rating` / `artists.review_count`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return neon(url);
};

let ready: Promise<void> | null = null;

export function ensureReviewTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureAgendaTable();
      const sql = connect();
      await sql`CREATE TABLE IF NOT EXISTS account_reviews (
        id serial PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        agenda_entry_id integer UNIQUE REFERENCES agenda_entries(id) ON DELETE SET NULL,
        author text NOT NULL,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        text text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        reply text,
        replied_at timestamptz,
        hidden boolean NOT NULL DEFAULT false
      )`;
      await sql`CREATE INDEX IF NOT EXISTS account_reviews_account ON account_reviews (account_id, created_at DESC)`;
      await sql`ALTER TABLE agenda_entries ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz`;
      // Réponse du tatoueur affichée sur le site (table créée par scripts/seed-neon.ts).
      try {
        await sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply text`;
      } catch (e) {
        console.error("[avis] colonne reviews.reply :", e);
      }
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : "");

export interface AccountReview {
  id: number;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
  reply: string | null;
  hidden: boolean;
}

function toReview(r: Row): AccountReview {
  return { id: r.id, author: r.author, rating: r.rating, text: r.text ?? "", createdAt: iso(r.created_at), reply: r.reply ?? null, hidden: Boolean(r.hidden) };
}

/* ---------- Demandes d'avis (e-mail après le rendez-vous) ---------- */

export type DueReviewRequest = {
  entryId: number;
  clientName: string;
  clientEmail: string;
  artist: { name: string; studio: string; email: string };
  subscriptionStatus: string | null;
};

/** Rendez-vous passés (de `from` à `to`) avec un e-mail client, sans demande d'avis envoyée, chez un tatoueur en ligne. */
export async function dueReviewRequests(from: string, to: string): Promise<DueReviewRequest[]> {
  await ensureReviewTables();
  const rows = (await connect()`SELECT e.id, e.client_name, e.client_email, a.name AS artist_name, a.studio AS artist_studio,
      a.email AS artist_email, a.subscription_status
    FROM agenda_entries e JOIN artist_accounts a ON a.id = e.account_id
    WHERE e.kind = 'appointment' AND e.day BETWEEN ${from} AND ${to} AND e.client_email <> ''
      AND e.review_request_sent_at IS NULL AND a.profile_status = 'published'
      AND NOT EXISTS (SELECT 1 FROM account_reviews r WHERE r.agenda_entry_id = e.id)
    ORDER BY e.day, e.id`) as Row[];
  return rows.map((r) => ({
    entryId: r.id,
    clientName: r.client_name ?? "",
    clientEmail: r.client_email,
    artist: { name: r.artist_name ?? "", studio: r.artist_studio ?? "", email: r.artist_email ?? "" },
    subscriptionStatus: r.subscription_status ?? null,
  }));
}

/** Réserve l'envoi de la demande (une seule fois par rendez-vous). */
export async function claimReviewRequest(entryId: number): Promise<boolean> {
  const rows = (await connect()`UPDATE agenda_entries SET review_request_sent_at = now()
    WHERE id = ${entryId} AND review_request_sent_at IS NULL RETURNING id`) as Row[];
  return rows.length > 0;
}

export async function releaseReviewRequest(entryId: number): Promise<void> {
  await connect()`UPDATE agenda_entries SET review_request_sent_at = NULL WHERE id = ${entryId}`;
}

/* ---------- Dépôt d'un avis par le client ---------- */

export type ReviewContext = {
  entryId: number;
  accountId: number;
  date: string;
  suggestedAuthor: string;
  artist: { name: string; studio: string; email: string };
  alreadyReviewed: boolean;
};

/** Rendez-vous du lien : tatoueur, date, avis déjà donné ou non. Null si le rendez-vous n'existe plus. */
export async function reviewContext(entryId: number): Promise<ReviewContext | null> {
  await ensureReviewTables();
  const rows = (await connect()`SELECT e.id, e.account_id, e.day, e.client_name, a.name AS artist_name, a.studio AS artist_studio, a.email AS artist_email,
      EXISTS (SELECT 1 FROM account_reviews r WHERE r.agenda_entry_id = e.id) AS reviewed
    FROM agenda_entries e JOIN artist_accounts a ON a.id = e.account_id
    WHERE e.id = ${entryId} AND e.kind = 'appointment'`) as Row[];
  const r = rows[0];
  if (!r) return null;
  return {
    entryId: r.id,
    accountId: r.account_id,
    date: r.day,
    suggestedAuthor: publicAuthorName(r.client_name ?? ""),
    artist: { name: r.artist_name ?? "", studio: r.artist_studio ?? "", email: r.artist_email ?? "" },
    alreadyReviewed: Boolean(r.reviewed),
  };
}

/** Enregistre l'avis (un seul par rendez-vous). Renvoie false s'il en existait déjà un. */
export async function createReview(ctx: Pick<ReviewContext, "entryId" | "accountId">, input: ReviewInput): Promise<boolean> {
  await ensureReviewTables();
  const rows = (await connect()`INSERT INTO account_reviews (account_id, agenda_entry_id, author, rating, text)
    VALUES (${ctx.accountId}, ${ctx.entryId}, ${input.author}, ${input.rating}, ${input.text})
    ON CONFLICT (agenda_entry_id) DO NOTHING RETURNING id`) as Row[];
  if (!rows[0]) return false;
  await syncSiteReviews(ctx.accountId);
  return true;
}

/* ---------- Espace tatoueur : ses avis et ses réponses ---------- */

export async function listAccountReviews(accountId: number): Promise<AccountReview[]> {
  await ensureReviewTables();
  const rows = (await connect()`SELECT * FROM account_reviews WHERE account_id = ${accountId} ORDER BY created_at DESC LIMIT 200`) as Row[];
  return rows.map(toReview);
}

/** Réponse publique du tatoueur (null : la retirer). */
export async function replyToReview(accountId: number, reviewId: number, reply: string | null): Promise<AccountReview | null> {
  await ensureReviewTables();
  const rows = (await connect()`UPDATE account_reviews SET reply = ${reply}, replied_at = ${reply ? new Date().toISOString() : null}
    WHERE id = ${reviewId} AND account_id = ${accountId} RETURNING *`) as Row[];
  if (!rows[0]) return null;
  await syncSiteReviews(accountId);
  return toReview(rows[0]);
}

/* ---------- Modération (admin) ---------- */

export type AdminReview = AccountReview & { accountId: number; artistName: string };

export async function listRecentReviews(limit = 100): Promise<AdminReview[]> {
  await ensureReviewTables();
  const rows = (await connect()`SELECT r.*, a.name AS artist_name FROM account_reviews r JOIN artist_accounts a ON a.id = r.account_id
    ORDER BY r.created_at DESC LIMIT ${limit}`) as Row[];
  return rows.map((r) => ({ ...toReview(r), accountId: r.account_id, artistName: r.artist_name ?? "" }));
}

export async function setReviewHidden(reviewId: number, hidden: boolean): Promise<AdminReview | null> {
  await ensureReviewTables();
  const sql = connect();
  const rows = (await sql`UPDATE account_reviews SET hidden = ${hidden} WHERE id = ${reviewId} RETURNING account_id`) as Row[];
  if (!rows[0]) return null;
  await syncSiteReviews(rows[0].account_id);
  const updated = (await sql`SELECT r.*, a.name AS artist_name FROM account_reviews r JOIN artist_accounts a ON a.id = r.account_id
    WHERE r.id = ${reviewId}`) as Row[];
  return updated[0] ? { ...toReview(updated[0]), accountId: updated[0].account_id, artistName: updated[0].artist_name ?? "" } : null;
}

/* ---------- Copie sur le site ---------- */

/**
 * Recopie les avis publiés du tatoueur dans `reviews` et met à jour sa note
 * (`artists.rating`, `artists.review_count`). Sans effet tant que le profil
 * n'est pas en ligne (pas de ligne `artists`) : appelée aussi à la publication.
 */
export async function syncSiteReviews(accountId: number): Promise<void> {
  await ensureReviewTables();
  const sql = connect();
  const artistId = artistIdFor(accountId);
  const online = (await sql`SELECT 1 FROM artists WHERE id = ${artistId}`) as Row[];
  if (!online.length) return;
  const reviews = ((await sql`SELECT * FROM account_reviews WHERE account_id = ${accountId} AND NOT hidden ORDER BY created_at DESC`) as Row[]).map(toReview);
  const rows = reviews.map((r) => ({
    id: siteReviewId(r.id),
    artist_id: artistId,
    author: r.author,
    rating: r.rating,
    date: r.createdAt.slice(0, 10),
    text: r.text,
    style: null,
    reply: r.reply,
  }));
  await sql`DELETE FROM reviews WHERE artist_id = ${artistId}`;
  if (rows.length) {
    await sql`INSERT INTO reviews SELECT * FROM json_populate_recordset(null::reviews, ${JSON.stringify(rows)}::json)`;
  }
  const { rating, count } = summarizeRatings(reviews.map((r) => r.rating));
  await sql`UPDATE artists SET rating = ${rating}, review_count = ${count} WHERE id = ${artistId}`;
}
