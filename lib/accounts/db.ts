import "server-only";
import { neon } from "@neondatabase/serverless";
import { tokenHash } from "../auth/password";
import type { StyleSlug } from "../types";
import { toArtistRow, type ArtistTitle, type ProfileInput, type ProfileStatus } from "./profile";

/**
 * Comptes tatoueurs dans Neon. Tables créées automatiquement au premier usage :
 * - artist_accounts : identifiants, profil (brouillon ou publié), abonnement Stripe ;
 * - artist_sessions : sessions de connexion (empreinte du jeton du cookie) ;
 * - password_resets : liens « mot de passe oublié » (empreinte, 1 h, usage unique).
 * À la validation, le profil est copié dans la table `artists` lue par le site.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return neon(url);
};

export const SESSION_DAYS = 30;
const RESET_MINUTES = 60;

let ready: Promise<void> | null = null;

/** Crée les tables au premier appel (une fois par instance du serveur). */
export function ensureAccountTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = connect();
      await sql`CREATE TABLE IF NOT EXISTS artist_accounts (
        id serial PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        email text NOT NULL UNIQUE,
        password_hash text,
        signup_id integer,
        name text NOT NULL DEFAULT '',
        title text NOT NULL DEFAULT 'Tatoueur',
        studio text NOT NULL DEFAULT '',
        address text NOT NULL DEFAULT '',
        city text NOT NULL DEFAULT '',
        lat double precision,
        lng double precision,
        styles text[] NOT NULL DEFAULT '{}',
        price_from integer,
        hourly_rate integer,
        bio text NOT NULL DEFAULT '',
        instagram text NOT NULL DEFAULT '',
        profile_status text NOT NULL DEFAULT 'draft',
        submitted_at timestamptz,
        published_at timestamptz,
        artist_id text,
        stripe_subscription_id text,
        stripe_customer_id text,
        subscription_status text
      )`;
      await sql`CREATE TABLE IF NOT EXISTS artist_sessions (
        token_hash text PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS password_resets (
        token_hash text PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      )`;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export interface Account {
  id: number;
  email: string;
  hasPassword: boolean;
  signupId: number | null;
  name: string;
  title: ArtistTitle;
  studio: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  styles: StyleSlug[];
  priceFrom: number | null;
  hourlyRate: number | null;
  bio: string;
  instagram: string;
  status: ProfileStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  artistId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);

function toAccount(r: Row): Account {
  return {
    id: r.id,
    email: r.email,
    hasPassword: Boolean(r.password_hash),
    signupId: r.signup_id ?? null,
    name: r.name ?? "",
    title: r.title ?? "Tatoueur",
    studio: r.studio ?? "",
    address: r.address ?? "",
    city: r.city ?? "",
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    styles: r.styles ?? [],
    priceFrom: r.price_from ?? null,
    hourlyRate: r.hourly_rate ?? null,
    bio: r.bio ?? "",
    instagram: r.instagram ?? "",
    status: (r.profile_status ?? "draft") as ProfileStatus,
    submittedAt: iso(r.submitted_at),
    publishedAt: iso(r.published_at),
    artistId: r.artist_id ?? null,
    subscriptionId: r.stripe_subscription_id ?? null,
    subscriptionStatus: r.subscription_status ?? null,
    createdAt: iso(r.created_at) ?? "",
  };
}

export class EmailTakenError extends Error {
  constructor() {
    super("Un compte existe déjà avec cet e-mail.");
  }
}

/** Crée un compte (pré-rempli avec l'inscription). Lève EmailTakenError si l'e-mail est pris. */
export async function createAccount(data: {
  email: string;
  passwordHash: string | null;
  signupId: number | null;
  name: string;
  studio: string;
  address: string;
  city: string;
  styles: StyleSlug[];
  priceFrom: number | null;
  instagram: string;
}): Promise<number> {
  await ensureAccountTables();
  const sql = connect();
  const rows = (await sql`INSERT INTO artist_accounts (email, password_hash, signup_id, name, studio, address, city, styles, price_from, instagram)
    VALUES (${data.email.toLowerCase()}, ${data.passwordHash}, ${data.signupId}, ${data.name}, ${data.studio}, ${data.address}, ${data.city}, ${data.styles}, ${data.priceFrom}, ${data.instagram})
    ON CONFLICT (email) DO NOTHING
    RETURNING id`) as Row[];
  if (!rows[0]) throw new EmailTakenError();
  return rows[0].id as number;
}

export async function findAccountByEmail(email: string): Promise<{ id: number; passwordHash: string | null } | null> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT id, password_hash FROM artist_accounts WHERE email = ${email.trim().toLowerCase()}`) as Row[];
  return rows[0] ? { id: rows[0].id, passwordHash: rows[0].password_hash ?? null } : null;
}

export async function getAccount(id: number): Promise<Account | null> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT * FROM artist_accounts WHERE id = ${id}`) as Row[];
  return rows[0] ? toAccount(rows[0]) : null;
}

/* ---------- Sessions ---------- */

export async function createSession(accountId: number, token: string): Promise<void> {
  await ensureAccountTables();
  const sql = connect();
  await sql`INSERT INTO artist_sessions (token_hash, account_id, expires_at)
    VALUES (${tokenHash(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  // Ménage léger : sessions expirées de ce compte.
  await sql`DELETE FROM artist_sessions WHERE account_id = ${accountId} AND expires_at < now()`;
}

export async function accountForSession(token: string): Promise<Account | null> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT a.* FROM artist_sessions s JOIN artist_accounts a ON a.id = s.account_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now()`) as Row[];
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function deleteSession(token: string): Promise<void> {
  await ensureAccountTables();
  await connect()`DELETE FROM artist_sessions WHERE token_hash = ${tokenHash(token)}`;
}

/* ---------- Mot de passe oublié ---------- */

/**
 * Compte pour une demande de réinitialisation. Un tatoueur inscrit avant la
 * création des comptes (inscription sans compte) en reçoit un, pré-rempli.
 */
export async function accountForReset(email: string): Promise<number | null> {
  const found = await findAccountByEmail(email);
  if (found) return found.id;
  const sql = connect();
  let signup: Row | undefined;
  try {
    signup = ((await sql`SELECT * FROM artist_signups WHERE email = ${email.trim().toLowerCase()} ORDER BY id DESC LIMIT 1`) as Row[])[0];
  } catch {
    return null; // table artist_signups absente
  }
  if (!signup) return null;
  try {
    const id = await createAccount({
      email: signup.email,
      passwordHash: null,
      signupId: signup.id,
      name: signup.name ?? "",
      studio: signup.studio ?? "",
      address: signup.address ?? "",
      city: signup.city ?? "",
      styles: signup.styles ?? [],
      priceFrom: signup.price_from ?? null,
      instagram: signup.instagram ?? "",
    });
    if (signup.stripe_subscription_id) {
      await sql`UPDATE artist_accounts SET stripe_subscription_id = ${signup.stripe_subscription_id}, stripe_customer_id = ${signup.stripe_customer_id ?? null},
        subscription_status = ${signup.subscription_status ?? null} WHERE id = ${id}`;
    }
    return id;
  } catch (e) {
    if (e instanceof EmailTakenError) return (await findAccountByEmail(email))?.id ?? null;
    throw e;
  }
}

export async function createPasswordReset(accountId: number, token: string): Promise<void> {
  await ensureAccountTables();
  await connect()`INSERT INTO password_resets (token_hash, account_id, expires_at)
    VALUES (${tokenHash(token)}, ${accountId}, now() + make_interval(mins => ${RESET_MINUTES}))`;
}

/** Utilise un lien de réinitialisation (une seule fois) et change le mot de passe. Déconnecte les autres appareils. */
export async function resetPassword(token: string, passwordHash: string): Promise<number | null> {
  await ensureAccountTables();
  const sql = connect();
  const rows = (await sql`UPDATE password_resets SET used_at = now()
    WHERE token_hash = ${tokenHash(token)} AND used_at IS NULL AND expires_at > now()
    RETURNING account_id`) as Row[];
  const accountId = rows[0]?.account_id as number | undefined;
  if (!accountId) return null;
  await sql`UPDATE artist_accounts SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${accountId}`;
  await sql`DELETE FROM artist_sessions WHERE account_id = ${accountId}`;
  return accountId;
}

/* ---------- Profil ---------- */

export async function updateProfile(id: number, p: ProfileInput, coords: { lat: number; lng: number; city: string }): Promise<Account | null> {
  await ensureAccountTables();
  const rows = (await connect()`UPDATE artist_accounts SET
      name = ${p.name}, title = ${p.title}, studio = ${p.studio}, address = ${p.address}, city = ${coords.city || p.city},
      lat = ${coords.lat}, lng = ${coords.lng}, styles = ${p.styles}, price_from = ${p.priceFrom}, hourly_rate = ${p.hourlyRate},
      bio = ${p.bio}, instagram = ${p.instagram}, updated_at = now()
    WHERE id = ${id} RETURNING *`) as Row[];
  const account = rows[0] ? toAccount(rows[0]) : null;
  // Un profil déjà validé est mis à jour sur le site immédiatement.
  if (account?.status === "published") await upsertArtist(account);
  return account;
}

export async function submitProfile(id: number): Promise<void> {
  await ensureAccountTables();
  await connect()`UPDATE artist_accounts SET profile_status = 'submitted', submitted_at = now(), updated_at = now()
    WHERE id = ${id} AND profile_status = 'draft'`;
}

/* ---------- Abonnement Stripe ---------- */

/** Rattache un abonnement payé au compte (par session, sinon par l'inscription d'origine). */
export async function linkSubscription(
  where: { accountId?: number | null; signupId?: number | null },
  sub: { subscriptionId: string; customerId: string | null; status: string },
): Promise<void> {
  if (!where.accountId && !where.signupId) return;
  await ensureAccountTables();
  await connect()`UPDATE artist_accounts SET stripe_subscription_id = ${sub.subscriptionId},
      stripe_customer_id = COALESCE(${sub.customerId}, stripe_customer_id), subscription_status = ${sub.status}, updated_at = now()
    WHERE id = ${where.accountId ?? -1} OR (${where.signupId ?? null}::int IS NOT NULL AND signup_id = ${where.signupId ?? null}::int)`;
}

/** Statut reçu par webhook Stripe. */
export async function updateAccountSubscription(subscriptionId: string, status: string): Promise<void> {
  await ensureAccountTables();
  await connect()`UPDATE artist_accounts SET subscription_status = ${status}, updated_at = now() WHERE stripe_subscription_id = ${subscriptionId}`;
}

/* ---------- Validation (admin) ---------- */

export async function listAccounts(): Promise<Account[]> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT * FROM artist_accounts
    ORDER BY CASE profile_status WHEN 'submitted' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, submitted_at DESC NULLS LAST, id DESC`) as Row[];
  return rows.map(toAccount);
}

async function upsertArtist(a: Account): Promise<string> {
  if (a.lat == null || a.lng == null) throw new Error("Profil sans localisation : impossible de le publier.");
  const row = toArtistRow({ ...a, lat: a.lat, lng: a.lng });
  await connect()`INSERT INTO artists (id, slug, name, title, city, city_slug, studio, address, lat, lng, rating, review_count, verified,
      styles, price_from, hourly_rate, bio, avatar, cover, instagram, promoted)
    VALUES (${row.id}, ${row.slug}, ${row.name}, ${row.title}, ${row.city}, ${row.city_slug}, ${row.studio}, ${row.address}, ${row.lat}, ${row.lng},
      0, 0, true, ${row.styles}, ${row.price_from}, ${row.hourly_rate}, ${row.bio}, ${JSON.stringify(row.avatar)}::jsonb, ${JSON.stringify(row.cover)}::jsonb,
      ${row.instagram}, false)
    ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, title = EXCLUDED.title, city = EXCLUDED.city,
      city_slug = EXCLUDED.city_slug, studio = EXCLUDED.studio, address = EXCLUDED.address, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
      styles = EXCLUDED.styles, price_from = EXCLUDED.price_from, hourly_rate = EXCLUDED.hourly_rate, bio = EXCLUDED.bio,
      avatar = EXCLUDED.avatar, cover = EXCLUDED.cover, instagram = EXCLUDED.instagram`;
  return row.slug;
}

/** Publie le profil sur le site (table artists). Renvoie le slug de la page publique. */
export async function publishAccount(id: number): Promise<string> {
  const account = await getAccount(id);
  if (!account) throw new Error("Compte introuvable");
  const slug = await upsertArtist(account);
  await connect()`UPDATE artist_accounts SET profile_status = 'published', published_at = now(), artist_id = ${`acc-${id}`}, updated_at = now() WHERE id = ${id}`;
  return slug;
}

/** Retire le profil du site (il redevient un brouillon modifiable). */
export async function unpublishAccount(id: number): Promise<void> {
  await ensureAccountTables();
  const sql = connect();
  await sql`DELETE FROM artists WHERE id = ${`acc-${id}`}`;
  await sql`UPDATE artist_accounts SET profile_status = 'draft', artist_id = NULL, updated_at = now() WHERE id = ${id}`;
}
