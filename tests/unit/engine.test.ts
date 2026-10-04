import { describe, expect, it } from "vitest";
import { getSeedArtists } from "@/lib/data/seed";
import { searchArtists } from "@/lib/search/engine";
import { DEFAULT_FILTERS, filtersFromParams, filtersToParams } from "@/lib/search/filters";
import { searchQueryFromParams } from "@/lib/search/query-params";
import type { SearchQuery } from "@/lib/types";

const artists = getSeedArtists();
const base = (over: Partial<SearchQuery> = {}): SearchQuery => ({ q: "", filters: { ...DEFAULT_FILTERS }, page: 1, pageSize: 12, ...over });

describe("données de démo", () => {
  it("≈30 tatoueurs répartis sur 8 villes, avec portfolio et avis", () => {
    expect(artists.length).toBe(30);
    expect(new Set(artists.map((a) => a.citySlug)).size).toBe(8);
    for (const a of artists) {
      expect(a.portfolio.length).toBeGreaterThanOrEqual(10);
      expect(a.reviews.length).toBeGreaterThan(0);
      expect(a.rating).toBeGreaterThanOrEqual(4.3);
    }
    expect(new Set(artists.map((a) => a.slug)).size).toBe(30);
  });
});

describe("searchArtists", () => {
  it("« Fine Line Nantes » → uniquement des tatoueurs fine line autour de Nantes, triés par distance", () => {
    const r = searchArtists(artists, base({ q: "Fine Line Nantes" }));
    expect(r.total).toBeGreaterThan(0);
    for (const c of r.markers) {
      expect(c.city).toBe("Nantes");
      expect(c.styles).toContain("fine-line");
    }
    const d = r.items.map((c) => c.distanceKm!);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });

  it("« Léa Ink » → Léa Ink en premier", () => {
    const r = searchArtists(artists, base({ q: "Léa Ink" }));
    expect(r.items[0]?.name).toBe("Léa Ink");
  });

  it("position + rayon : filtre par distance", () => {
    const r = searchArtists(artists, base({ center: { lat: 45.76, lng: 4.84 }, filters: { ...DEFAULT_FILTERS, radiusKm: 10 } }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.markers.every((c) => c.city === "Lyon" && c.distanceKm! <= 10)).toBe(true);
  });

  it("bbox (Rechercher dans cette zone)", () => {
    const r = searchArtists(artists, base({ bbox: [-1.75, 48.0, -1.55, 48.2] }));
    expect(r.markers.every((c) => c.city === "Rennes")).toBe(true);
  });

  it("filtres prix, note, style, disponibilité", () => {
    const r = searchArtists(
      artists,
      base({ filters: { ...DEFAULT_FILTERS, styles: ["realisme"], priceMax: 210, ratingMin: 4.5, availability: "month" } }),
    );
    for (const c of r.markers) {
      expect(c.styles).toContain("realisme");
      expect(c.priceFrom).toBeLessThanOrEqual(210);
      expect(c.rating).toBeGreaterThanOrEqual(4.5);
      expect(c.nextSlot).not.toBeNull();
    }
  });

  it("pagination : items paginés, markers complets", () => {
    const r1 = searchArtists(artists, base({ pageSize: 10 }));
    const r3 = searchArtists(artists, base({ pageSize: 10, page: 3 }));
    expect(r1.items).toHaveLength(10);
    expect(r1.hasMore).toBe(true);
    expect(r3.hasMore).toBe(false);
    expect(r1.markers).toHaveLength(30);
    expect(r1.markers[0]!.previews).toEqual([]);
    const r0 = searchArtists(artists, base({ pageSize: 0 }));
    expect(r0.items).toHaveLength(0);
    expect(r0.total).toBe(30);
  });
});

describe("filtres ↔ URL", () => {
  it("aller-retour sans perte", () => {
    const f = { styles: ["floral", "fine-line"] as const, radiusKm: 40, priceMin: 80, priceMax: 200, availability: "week" as const, ratingMin: 4.8 };
    const p = filtersToParams({ ...f, styles: [...f.styles] });
    expect(filtersFromParams(p)).toEqual({ ...f, styles: [...f.styles] });
  });

  it("ignore les valeurs invalides et borne le rayon", () => {
    const f = filtersFromParams(new URLSearchParams("styles=foo,floral&radius=900&note=3&dispo=jamais"));
    expect(f).toEqual({ ...DEFAULT_FILTERS, styles: ["floral"], radiusKm: 100 });
  });

  it("la position est arrondie côté serveur", () => {
    const q = searchQueryFromParams(new URLSearchParams("lat=47.218371&lng=-1.553621"));
    expect(q.center).toEqual({ lat: 47.22, lng: -1.55 });
  });
});
