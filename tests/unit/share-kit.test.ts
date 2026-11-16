import { describe, expect, it } from "vitest";
import { profileShareUrl, shareTexts, type ShareChannel } from "@/lib/share-kit";

const links = Object.fromEntries(
  (["qr", "story", "bio", "lien"] as ShareChannel[]).map((c) => [c, profileShareUrl("https://www.fastattoo.com/", "marie-lyon-12", c)]),
) as Record<ShareChannel, string>;

describe("kit de partage", () => {
  it("un lien par support, vers le profil public", () => {
    expect(links.qr).toBe("https://www.fastattoo.com/tatoueurs/marie-lyon-12?utm_source=qr");
    expect(new Set(Object.values(links)).size).toBe(4);
  });

  it("les textes contiennent le bon lien et le lieu", () => {
    const t = shareTexts({ name: "Marie", studio: "Black Rose", city: "Lyon", styles: ["Fine Line", "Floral", "Minimaliste", "Japonais"] }, links);
    expect(t.bio).toContain(links.bio);
    expect(t.bio).toContain("Black Rose, Lyon");
    expect(t.bio).toContain("fine line, floral et minimaliste");
    expect(t.bio).not.toContain("japonais");
    expect(t.story).toContain(links.story);
    expect(t.message).toContain(links.lien);
    expect(t.review).toContain(links.lien);
  });

  it("sans studio ni style", () => {
    const t = shareTexts({ name: "Léo", studio: "", city: "Nantes", styles: [] }, links);
    expect(t.bio.startsWith("📍 Nantes\n")).toBe(true);
  });
});
