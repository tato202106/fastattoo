import "server-only";
import { neon } from "@neondatabase/serverless";
import { tokenHash } from "../auth/password";
import { hasPaidAccess } from "../billing/access";
import { parseCountry, type CountryCode } from "../countries";
import type { BodyZone, ImageAsset, OpeningHours, PortfolioItem, Slot, StyleSlug } from "../types";
import { readOpeningHours } from "./availability";
import { geocode } from "./geocode";
import { artistIdFor, autoPublishDecision, subscriptionEnded, toArtistRow, type ArtistTitle, type ProfileInput, type ProfileStatus } from "./profile";

/**
 * Comptes tatoueurs dans Neon. Tables créées automatiquement au premier usage :
 * - artist_accounts : identifiants, profil (brouillon ou publié), abonnement Stripe ;
 * - artist_sessions : sessions de connexion (empreinte du jeton du cookie) ;
 * - password_resets : liens « mot de passe oublié » (empreinte, 1 h, usage unique) ;
 * - account_photos : photos du portfolio ajoutées depuis l'espace tatoueur ;
 * - account_slots : créneaux libres (horaires d'ouverture : colonne opening_hours).
 * À la publication (automatique dès que l'abonnement est actif), le profil et
 * ses photos sont copiés dans les tables `artists` et `portfolio_items` lues par le site.
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
      await sql`CREATE TABLE IF NOT EXISTS account_photos (
        id text PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        position integer NOT NULL DEFAULT 0,
        base text NOT NULL,
        width integer NOT NULL,
        height integer NOT NULL,
        color text NOT NULL,
        alt text NOT NULL DEFAULT '',
        style text NOT NULL,
        zone text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE artist_accounts ADD COLUMN IF NOT EXISTS opening_hours jsonb`;
      await sql`CREATE TABLE IF NOT EXISTS account_slots (
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        date date NOT NULL,
        time time NOT NULL,
        PRIMARY KEY (account_id, date, time)
      )`;
      // Horaires affichés sur le profil public (table du site, créée par scripts/seed-neon.ts).
      try {
        await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS opening_hours jsonb`;
      } catch (e) {
        console.error("[compte] colonne artists.opening_hours :", e);
      }
      // Comptes créés avant l'ouverture à la Belgique : France par défaut.
      await sql`ALTER TABLE artist_accounts ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'FR'`;
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
  country: CountryCode;
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
  /** Horaires d'ouverture (null tant qu'ils ne sont pas renseignés). */
  openingHours: OpeningHours | null;
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
    country: parseCountry(r.country),
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
    openingHours: readOpeningHours(r.opening_hours),
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
  country: CountryCode;
  styles: StyleSlug[];
  priceFrom: number | null;
  instagram: string;
}): Promise<number> {
  await ensureAccountTables();
  const sql = connect();
  const rows = (await sql`INSERT INTO artist_accounts (email, password_hash, signup_id, name, studio, address, city, country, styles, price_from, instagram)
    VALUES (${data.email.toLowerCase()}, ${data.passwordHash}, ${data.signupId}, ${data.name}, ${data.studio}, ${data.address}, ${data.city}, ${data.country}, ${data.styles}, ${data.priceFrom}, ${data.instagram})
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
      country: parseCountry(signup.country),
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
      name = ${p.name}, title = ${p.title}, studio = ${p.studio}, address = ${p.address}, city = ${coords.city || p.city}, country = ${p.country},
      lat = ${coords.lat}, lng = ${coords.lng}, styles = ${p.styles}, price_from = ${p.priceFrom}, hourly_rate = ${p.hourlyRate},
      bio = ${p.bio}, instagram = ${p.instagram}, updated_at = now()
    WHERE id = ${id} RETURNING *`) as Row[];
  const account = rows[0] ? toAccount(rows[0]) : null;
  if (!account) return null;
  // Un profil en ligne est mis à jour sur le site immédiatement ; un abonné pas encore en ligne y apparaît.
  if (account.status === "published") {
    await upsertArtist(account);
    return account;
  }
  return (await autoPublish(account.id)).account ?? account;
}

/* ---------- Abonnement Stripe ---------- */

/**
 * Rattache un abonnement payé au compte créé avec l'inscription d'origine
 * (identifiant d'inscription enregistré par le serveur dans la session Stripe).
 */
export async function linkSubscription(
  where: { accountId: number } | { signupId: number },
  sub: { subscriptionId: string; customerId: string | null; status: string },
): Promise<void> {
  await ensureAccountTables();
  const sql = connect();
  const rows = (
    "accountId" in where
      ? await sql`UPDATE artist_accounts SET stripe_subscription_id = ${sub.subscriptionId},
          stripe_customer_id = COALESCE(${sub.customerId}, stripe_customer_id), subscription_status = ${sub.status}, updated_at = now()
        WHERE id = ${where.accountId} RETURNING id`
      : await sql`UPDATE artist_accounts SET stripe_subscription_id = ${sub.subscriptionId},
          stripe_customer_id = COALESCE(${sub.customerId}, stripe_customer_id), subscription_status = ${sub.status}, updated_at = now()
        WHERE signup_id = ${where.signupId} RETURNING id`
  ) as Row[];
  await syncPublication(rows.map((r) => r.id as number));
}

/**
 * Statut reçu par webhook Stripe. Si aucun compte ne porte encore cet abonnement
 * (navigateur fermé avant la confirmation), on le rattache au compte indiqué dans
 * les métadonnées posées par le serveur lors du paiement.
 */
export async function updateAccountSubscription(
  subscriptionId: string,
  status: string,
  link?: { accountId?: number | null; customerId?: string | null },
): Promise<void> {
  await ensureAccountTables();
  const sql = connect();
  let rows = (await sql`UPDATE artist_accounts SET subscription_status = ${status}, updated_at = now()
    WHERE stripe_subscription_id = ${subscriptionId} RETURNING id`) as Row[];
  if (rows.length === 0 && link?.accountId) {
    rows = (await sql`UPDATE artist_accounts SET stripe_subscription_id = ${subscriptionId},
        stripe_customer_id = COALESCE(${link.customerId ?? null}, stripe_customer_id), subscription_status = ${status}, updated_at = now()
      WHERE id = ${link.accountId} AND (stripe_subscription_id IS NULL OR subscription_status IS NULL
        OR subscription_status NOT IN ('active', 'trialing', 'past_due')) RETURNING id`) as Row[];
  }
  await syncPublication(rows.map((r) => r.id as number));
}

/**
 * Après un changement d'abonnement : publication automatique d'un abonné,
 * retrait du site quand l'abonnement est terminé. N'interrompt jamais le
 * rattachement du paiement (erreurs journalisées).
 */
async function syncPublication(accountIds: number[]): Promise<void> {
  for (const id of accountIds) {
    try {
      const account = await getAccount(id);
      if (!account) continue;
      if (subscriptionEnded(account.subscriptionStatus) && account.status === "published") await unpublishAccount(id, "draft");
      else await autoPublish(id);
    } catch (e) {
      console.error(`[compte] publication automatique du compte ${id} impossible :`, e);
    }
  }
}

export type AutoPublishResult = { outcome: "published" | "needs-location" | "skip"; account: Account | null };

/**
 * Met en ligne le profil d'un tatoueur abonné (sans validation manuelle, même
 * sans photo). Géocode l'adresse de l'inscription si besoin pour la carte.
 */
export async function autoPublish(accountId: number): Promise<AutoPublishResult> {
  let account = await getAccount(accountId);
  if (!account) return { outcome: "skip", account: null };
  let decision = autoPublishDecision({ ...account, paid: hasPaidAccess(account.subscriptionStatus) });
  if (decision === "needs-location" && (account.address || account.city)) {
    const place = await geocode(account.address, account.city, account.country).catch(() => null);
    if (place) {
      const rows = (await connect()`UPDATE artist_accounts SET lat = ${place.lat}, lng = ${place.lng},
          city = ${account.city || place.city}, updated_at = now() WHERE id = ${accountId} RETURNING *`) as Row[];
      if (rows[0]) account = toAccount(rows[0]);
      decision = autoPublishDecision({ ...account, paid: hasPaidAccess(account.subscriptionStatus) });
    }
  }
  if (decision !== "publish") return { outcome: decision, account };
  await publishAccount(accountId);
  return { outcome: "published", account: await getAccount(accountId) };
}

/* ---------- Validation (admin) ---------- */

export async function listAccounts(): Promise<Account[]> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT * FROM artist_accounts
    ORDER BY CASE profile_status WHEN 'submitted' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, submitted_at DESC NULLS LAST, id DESC`) as Row[];
  return rows.map(toAccount);
}

/** Copie les photos du compte dans `portfolio_items` (table lue par le site). */
async function syncPortfolio(accountId: number): Promise<void> {
  const sql = connect();
  const artistId = artistIdFor(accountId);
  const photos = await listPhotos(accountId);
  const rows = photos.map((p, i) => ({
    id: p.id,
    artist_id: artistId,
    position: i,
    base: p.base,
    width: p.width,
    height: p.height,
    color: p.color,
    alt: p.alt,
    style: p.style,
    zone: p.zone,
  }));
  await sql`DELETE FROM portfolio_items WHERE artist_id = ${artistId}`;
  if (rows.length) {
    await sql`INSERT INTO portfolio_items SELECT * FROM json_populate_recordset(null::portfolio_items, ${JSON.stringify(rows)}::json)`;
  }
}

async function upsertArtist(a: Account): Promise<string> {
  if (a.lat == null || a.lng == null) throw new Error("Profil sans localisation : impossible de le publier.");
  const row = toArtistRow({ ...a, lat: a.lat, lng: a.lng });
  await connect()`INSERT INTO artists (id, slug, name, title, city, city_slug, studio, address, lat, lng, rating, review_count, verified,
      styles, price_from, hourly_rate, bio, avatar, cover, instagram, promoted, opening_hours)
    VALUES (${row.id}, ${row.slug}, ${row.name}, ${row.title}, ${row.city}, ${row.city_slug}, ${row.studio}, ${row.address}, ${row.lat}, ${row.lng},
      0, 0, true, ${row.styles}, ${row.price_from}, ${row.hourly_rate}, ${row.bio}, ${JSON.stringify(row.avatar)}::jsonb, ${JSON.stringify(row.cover)}::jsonb,
      ${row.instagram}, false, ${a.openingHours ? JSON.stringify(a.openingHours) : null}::jsonb)
    ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, title = EXCLUDED.title, city = EXCLUDED.city,
      city_slug = EXCLUDED.city_slug, studio = EXCLUDED.studio, address = EXCLUDED.address, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
      styles = EXCLUDED.styles, price_from = EXCLUDED.price_from, hourly_rate = EXCLUDED.hourly_rate, bio = EXCLUDED.bio,
      avatar = EXCLUDED.avatar, cover = EXCLUDED.cover, instagram = EXCLUDED.instagram, opening_hours = EXCLUDED.opening_hours`;
  await syncPortfolio(a.id);
  await syncSlots(a.id);
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

/**
 * Retire le profil du site. « hidden » (par l'équipe) : il n'est plus republié
 * automatiquement ; « draft » (fin d'abonnement) : il revient dès le prochain paiement.
 * Les photos restent dans le compte.
 */
export async function unpublishAccount(id: number, status: "hidden" | "draft" = "hidden"): Promise<void> {
  await ensureAccountTables();
  const sql = connect();
  await sql`DELETE FROM portfolio_items WHERE artist_id = ${artistIdFor(id)}`;
  await sql`DELETE FROM slots WHERE artist_id = ${artistIdFor(id)}`;
  await sql`DELETE FROM artists WHERE id = ${artistIdFor(id)}`;
  await sql`UPDATE artist_accounts SET profile_status = ${status}, artist_id = NULL, updated_at = now() WHERE id = ${id}`;
}

/* ---------- Photos du portfolio ---------- */

export const MAX_PHOTOS = 60;

export async function listPhotos(accountId: number): Promise<PortfolioItem[]> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT * FROM account_photos WHERE account_id = ${accountId} ORDER BY position, created_at DESC`) as Row[];
  return rows.map((r) => ({ id: r.id, base: r.base, width: r.width, height: r.height, color: r.color, alt: r.alt, style: r.style, zone: r.zone }));
}

/** Ajoute une photo en tête du portfolio ; visible sur le profil public s'il est en ligne. */
export async function addPhoto(accountId: number, image: ImageAsset, meta: { style: StyleSlug; zone: BodyZone }): Promise<PortfolioItem[]> {
  await ensureAccountTables();
  const sql = connect();
  const id = `acc${accountId}-${image.id}`;
  await sql`INSERT INTO account_photos (id, account_id, position, base, width, height, color, alt, style, zone)
    VALUES (${id}, ${accountId}, (SELECT COALESCE(MIN(position), 0) - 1 FROM account_photos WHERE account_id = ${accountId}),
      ${image.base}, ${image.width}, ${image.height}, ${image.color}, ${image.alt}, ${meta.style}, ${meta.zone})`;
  await refreshPublishedPortfolio(accountId);
  return listPhotos(accountId);
}

export async function deletePhoto(accountId: number, photoId: string): Promise<PortfolioItem[]> {
  await ensureAccountTables();
  await connect()`DELETE FROM account_photos WHERE id = ${photoId} AND account_id = ${accountId}`;
  await refreshPublishedPortfolio(accountId);
  return listPhotos(accountId);
}

export async function countPhotos(accountId: number): Promise<number> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT count(*)::int AS n FROM account_photos WHERE account_id = ${accountId}`) as Row[];
  return rows[0]?.n ?? 0;
}

async function refreshPublishedPortfolio(accountId: number): Promise<void> {
  const account = await getAccount(accountId);
  if (account?.status === "published") await syncPortfolio(accountId);
}

/* ---------- Horaires et créneaux libres ---------- */

/** Enregistre les horaires d'ouverture ; mis à jour sur le profil public s'il est en ligne. */
export async function setOpeningHours(accountId: number, hours: OpeningHours): Promise<Account | null> {
  await ensureAccountTables();
  const sql = connect();
  const json = JSON.stringify(hours);
  const rows = (await sql`UPDATE artist_accounts SET opening_hours = ${json}::jsonb, updated_at = now() WHERE id = ${accountId} RETURNING *`) as Row[];
  const account = rows[0] ? toAccount(rows[0]) : null;
  if (account?.status === "published") await sql`UPDATE artists SET opening_hours = ${json}::jsonb WHERE id = ${artistIdFor(accountId)}`;
  return account;
}

/** Créneaux libres à venir du compte. */
export async function listSlots(accountId: number): Promise<Slot[]> {
  await ensureAccountTables();
  const rows = (await connect()`SELECT to_char(date, 'YYYY-MM-DD') AS date, to_char(time, 'HH24:MI') AS time
    FROM account_slots WHERE account_id = ${accountId} AND date >= CURRENT_DATE ORDER BY date, time`) as Row[];
  return rows.map((r) => ({ date: r.date, time: r.time }));
}

/** Remplace les créneaux libres d'un jour ; visibles sur le profil public s'il est en ligne. */
export async function setDaySlots(accountId: number, date: string, times: string[]): Promise<Slot[]> {
  await ensureAccountTables();
  const sql = connect();
  await sql`DELETE FROM account_slots WHERE account_id = ${accountId} AND date = ${date}::date`;
  if (times.length) {
    await sql`INSERT INTO account_slots (account_id, date, time)
      SELECT ${accountId}, ${date}::date, t::time FROM unnest(${times}::text[]) AS t ON CONFLICT DO NOTHING`;
  }
  // Ménage : créneaux passés.
  await sql`DELETE FROM account_slots WHERE account_id = ${accountId} AND date < CURRENT_DATE - 1`;
  const account = await getAccount(accountId);
  if (account?.status === "published") await syncSlots(accountId);
  return listSlots(accountId);
}

/** Copie les créneaux à venir du compte dans `slots` (table lue par le site). */
async function syncSlots(accountId: number): Promise<void> {
  const sql = connect();
  const artistId = artistIdFor(accountId);
  await sql`DELETE FROM slots WHERE artist_id = ${artistId}`;
  await sql`INSERT INTO slots (artist_id, date, time)
    SELECT ${artistId}, date, time FROM account_slots WHERE account_id = ${accountId} AND date >= CURRENT_DATE
    ON CONFLICT DO NOTHING`;
}
