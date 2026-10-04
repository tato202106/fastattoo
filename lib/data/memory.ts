import { CITIES } from "../cities";
import { searchArtists, toCard } from "../search/engine";
import { STYLES } from "../styles";
import { normalize } from "../text";
import type { Artist, SearchQuery, Suggestion } from "../types";
import type { ArtistRepository } from "./repository";
import { getSeedArtists } from "./seed";

/** Implémentation en mémoire sur les données de démo. */
export class MemoryArtistRepository implements ArtistRepository {
  constructor(private readonly source: () => Artist[] = getSeedArtists) {}

  async search(query: SearchQuery) {
    return searchArtists(this.source(), query);
  }

  async getBySlug(slug: string) {
    return this.source().find((a) => a.slug === slug) ?? null;
  }

  async getById(id: string) {
    return this.source().find((a) => a.id === id) ?? null;
  }

  async getCards(ids: string[]) {
    const byId = new Map(this.source().map((a) => [a.id, a]));
    return ids.flatMap((id) => {
      const a = byId.get(id);
      return a ? [toCard(a, null)] : [];
    });
  }

  async featured(limit: number) {
    return [...this.source()]
      .sort((a, b) => b.rating * Math.log(b.reviewCount + 1) - a.rating * Math.log(a.reviewCount + 1))
      .slice(0, limit)
      .map((a) => toCard(a, null));
  }

  async suggest(q: string, limit = 8): Promise<Suggestion[]> {
    const t = normalize(q);
    if (!t) return [];
    const words = t.split(" ");
    const last = words[words.length - 1]!;
    const out: Suggestion[] = [];
    for (const s of STYLES) {
      if (s.synonyms.some((syn) => syn.startsWith(t) || syn.startsWith(last)) || normalize(s.label).startsWith(t)) {
        out.push({ type: "style", label: s.label, sublabel: "Style", slug: s.slug });
      }
    }
    for (const c of CITIES) {
      if (c.aliases.some((al) => al.startsWith(t) || al.startsWith(last))) {
        const count = this.source().filter((a) => a.citySlug === c.slug).length;
        out.push({ type: "city", label: c.name, sublabel: `${count} tatoueurs`, slug: c.slug });
      }
    }
    for (const a of this.source()) {
      const n = normalize(a.name);
      const st = normalize(a.studio);
      if (n.startsWith(t) || n.split(" ").some((w) => w.startsWith(t)) || st.includes(t)) {
        out.push({ type: "artist", label: a.name, sublabel: `${a.studio} · ${a.city}`, slug: a.slug, avatar: a.avatar });
      }
    }
    return out.slice(0, limit);
  }

  async allSlugs() {
    return this.source().map((a) => a.slug);
  }
}
