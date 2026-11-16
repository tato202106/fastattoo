import { describe, expect, it } from "vitest";
import { GUIDES, guideBySlug } from "@/lib/guides";

describe("guides", () => {
  it("slugs uniques et retrouvables", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) expect(guideBySlug(g.slug)).toBe(g);
    expect(guideBySlug("inconnu")).toBeUndefined();
  });

  it("chaque guide a une description pour Google, des sections, un lien vers la carte et ses sources", () => {
    for (const g of GUIDES) {
      expect(g.description.length).toBeGreaterThan(80);
      expect(g.description.length).toBeLessThanOrEqual(170);
      expect(g.sections.length).toBeGreaterThan(0);
      expect(g.cta.href.startsWith("/")).toBe(true);
      expect(g.sources.length).toBeGreaterThan(0);
      for (const s of g.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
