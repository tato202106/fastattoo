import { describe, expect, it } from "vitest";
import { splitMasonry } from "@/lib/masonry";

describe("splitMasonry", () => {
  it("équilibre les colonnes et garde l'ordre", () => {
    const items = [
      { id: 0, width: 1, height: 2 },
      { id: 1, width: 1, height: 1 },
      { id: 2, width: 1, height: 1 },
      { id: 3, width: 1, height: 1 },
    ];
    const cols = splitMasonry(items, 2);
    expect(cols[0]!.map((c) => c.item.id)).toEqual([0, 3]);
    expect(cols[1]!.map((c) => c.item.id)).toEqual([1, 2]);
  });

  it("répartit tous les éléments", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({ width: 4, height: 5 + (i % 3) }));
    const cols = splitMasonry(items, 2);
    expect(cols.flat()).toHaveLength(13);
  });
});
