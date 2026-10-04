import { describe, expect, it } from "vitest";
import { imageUrl, parseVariantFile, srcSet, variantWidth } from "@/lib/images";

const img = { base: "/media/art/floral/12" };

describe("images", () => {
  it("construit les URLs de variantes", () => {
    expect(imageUrl(img, "thumbnail", "avif")).toBe("/media/art/floral/12/thumbnail.avif");
  });

  it("srcset par usage : liste = thumbnail/small, plein écran = medium/large", () => {
    expect(srcSet(img, "list", "webp")).toBe("/media/art/floral/12/thumbnail.webp 200w, /media/art/floral/12/small.webp 400w");
    expect(srcSet(img, "fullscreen", "avif")).toContain("large.avif 1600w");
  });

  it("valide les noms de fichiers de variantes", () => {
    expect(parseVariantFile("medium.webp")).toEqual({ size: "medium", format: "webp" });
    expect(parseVariantFile("huge.webp")).toBeNull();
    expect(parseVariantFile("medium.png")).toBeNull();
    expect(parseVariantFile("../medium.webp")).toBeNull();
  });

  it("n'agrandit jamais une source plus petite", () => {
    expect(variantWidth("large", 900)).toBe(900);
    expect(variantWidth("thumbnail", 900)).toBe(200);
    expect(variantWidth("original", 5000)).toBe(2400);
  });
});
