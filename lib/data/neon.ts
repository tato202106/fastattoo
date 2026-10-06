import { neon } from "@neondatabase/serverless";
import type { Artist, SearchQuery } from "../types";
import { MemoryArtistRepository } from "./memory";
import type { ArtistRepository } from "./repository";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function groupByArtist(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const list = map.get(r.artist_id) ?? [];
    list.push(r);
    map.set(r.artist_id, list);
  }
  return map;
}

/** Charge tous les tatoueurs depuis Neon et les remet au format de l'appli. */
async function loadArtists(): Promise<Artist[]> {
  const sql = neon(process.env.DATABASE_URL!);
  const [artistRows, portfolioRows, reviewRows, slotRows] = (await Promise.all([
    sql`SELECT * FROM artists ORDER BY id`,
    sql`SELECT * FROM portfolio_items ORDER BY artist_id, position`,
    sql`SELECT id, artist_id, author, rating, to_char(date, 'YYYY-MM-DD') AS date, text, style
        FROM reviews ORDER BY date DESC`,
    sql`SELECT artist_id, to_char(date, 'YYYY-MM-DD') AS date, to_char(time, 'HH24:MI') AS time
        FROM slots ORDER BY date, time`,
   ])) as [Row[], Row[], Row[], Row[]];

  const portfolio = groupByArtist(portfolioRows);
  const reviews = groupByArtist(reviewRows);
  const slots = groupByArtist(slotRows);

  return artistRows.map((a): Artist => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    title: a.title,
    city: a.city,
    citySlug: a.city_slug,
    studio: a.studio,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    rating: a.rating,
    reviewCount: a.review_count,
    verified: a.verified,
    styles: a.styles,
    priceFrom: a.price_from,
    hourlyRate: a.hourly_rate,
    bio: a.bio,
    avatar: a.avatar,
    cover: a.cover,
    portfolio: (portfolio.get(a.id) ?? []).map((p) => ({
      id: p.id,
      base: p.base,
      width: p.width,
      height: p.height,
      color: p.color,
      alt: p.alt,
      style: p.style,
      zone: p.zone,
    })),
    reviews: (reviews.get(a.id) ?? []).map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      date: r.date,
      text: r.text,
      ...(r.style ? { style: r.style } : {}),
    })),
    nextSlots: (slots.get(a.id) ?? []).map((s) => ({ date: s.date, time: s.time })),
    ...(a.instagram ? { instagram: a.instagram } : {}),
    ...(a.promoted ? { promoted: true } : {}),
  }));
}

/** Petit cache d'une minute pour ne pas interroger Neon à chaque clic. */
const CACHE_MS = 60_000;
let cache: { at: number; data: Promise<Artist[]> } | null = null;

function getArtists(): Promise<Artist[]> {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const data = loadArtists();
    cache = { at: Date.now(), data };
    data.catch(() => {
      cache = null;
    });
  }
  return cache.data;
}

/** Version Neon : lit les données dans Neon, puis réutilise la logique existante. */
export class NeonArtistRepository implements ArtistRepository {
  private async memory() {
    const list = await getArtists();
    return new MemoryArtistRepository(() => list);
  }
  async search(query: SearchQuery) {
    return (await this.memory()).search(query);
  }
  async getBySlug(slug: string) {
    return (await this.memory()).getBySlug(slug);
  }
  async getById(id: string) {
    return (await this.memory()).getById(id);
  }
  async getCards(ids: string[]) {
    return (await this.memory()).getCards(ids);
  }
  async featured(limit: number) {
    return (await this.memory()).featured(limit);
  }
  async suggest(q: string, limit?: number) {
    return (await this.memory()).suggest(q, limit);
  }
  async allSlugs() {
    return (await this.memory()).allSlugs();
  }
}