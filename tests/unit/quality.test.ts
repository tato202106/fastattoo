import { describe, expect, it } from "vitest";
import { getSeedArtists } from "@/lib/data/seed";
import { searchArtists } from "@/lib/search/engine";
import { DEFAULT_FILTERS } from "@/lib/search/filters";
import { isLowRated, QUALITY_PRIOR, qualityScore } from "@/lib/search/quality";
import { mapPinLabel } from "@/lib/showcase";
import type { Artist, SearchQuery } from "@/lib/types";

const seed = getSeedArtists();
const base = (over: Partial<SearchQuery> = {}): SearchQuery => ({ q: "", filters: { ...DEFAULT_FILTERS }, page: 1, pageSize: 50, ...over });

/** Tatoueur de test au même endroit que le premier tatoueur de démo. */
function artist(id: string, over: Partial<Artist>): Artist {
  return { ...seed[0]!, id, slug: id, name: id, sponsorUntil: undefined, ...over };
}

describe("score de qualité", () => {
  it("peu d'avis : tiré vers la note de référence", () => {
    expect(qualityScore({ rating: 5, reviewCount: 2 })).toBeLessThan(qualityScore({ rating: 4.8, reviewCount: 60 }));
  });

  it("nouveau tatoueur (0 avis) : note de référence, ni enterré ni favorisé", () => {
    expect(qualityScore({ rating: 0, reviewCount: 0 })).toBe(QUALITY_PRIOR);
  });

  it("note basse confirmée seulement avec assez d'avis", () => {
    expect(isLowRated({ rating: 3.2, reviewCount: 12 })).toBe(true);
    expect(isLowRated({ rating: 3.2, reviewCount: 2 })).toBe(false);
    expect(isLowRated({ rating: 4.1, reviewCount: 40 })).toBe(false);
  });
});

describe("classement de la recherche", () => {
  const top = artist("top", { rating: 4.9, reviewCount: 80, priceFrom: 250 });
  const cheapBad = artist("pas-cher-mal-note", { rating: 3.1, reviewCount: 25, priceFrom: 30 });
  const cheapSponsor = artist("parrain-mal-note", { rating: 3.0, reviewCount: 10, priceFrom: 40, sponsorUntil: "2999-01-01" });
  const fresh = artist("nouveau", { rating: 0, reviewCount: 0, priceFrom: 50 });
  const list = [cheapBad, cheapSponsor, fresh, top];

  it("les mieux notés d'abord, le prix n'entre pas en compte", () => {
    const r = searchArtists(list, base());
    expect(r.items.map((c) => c.id)).toEqual(["top", "nouveau", "parrain-mal-note", "pas-cher-mal-note"]);
  });

  it("un parrain mal noté ne passe pas devant un tatoueur bien noté", () => {
    const r = searchArtists([cheapSponsor, top], base());
    expect(r.items[0]?.id).toBe("top");
  });

  it("à qualité égale, le plus proche d'abord", () => {
    const near = artist("proche", { rating: 4.7, reviewCount: 30 });
    const far = artist("loin", { rating: 4.7, reviewCount: 30, lat: seed[0]!.lat + 0.1 });
    const r = searchArtists([far, near], base({ center: { lat: seed[0]!.lat, lng: seed[0]!.lng } }));
    expect(r.items.map((c) => c.id)).toEqual(["proche", "loin"]);
  });
});

describe("épingles de la carte", () => {
  it("affichent la note, jamais le prix", () => {
    expect(mapPinLabel({ id: "acc-1", rating: 4.86, reviewCount: 12, styles: ["floral"] })).toBe("★ 4,9");
    expect(mapPinLabel({ id: "acc-2", rating: 0, reviewCount: 0, styles: ["floral"] })).toBe("Nouveau");
    expect(mapPinLabel({ id: "demo", rating: 4.8, reviewCount: 30, styles: ["floral"] })).not.toMatch(/€|★/);
  });
});
