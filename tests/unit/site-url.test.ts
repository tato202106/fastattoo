import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

describe("adresse du site", () => {
  it("prend NEXT_PUBLIC_SITE_URL en priorité, sans / final", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://fastattoo.fr/", VERCEL_PROJECT_PRODUCTION_URL: "fastattoo.vercel.app" })).toBe("https://fastattoo.fr");
  });

  it("se rabat sur le domaine de production Vercel", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "fastattoo.vercel.app" })).toBe("https://fastattoo.vercel.app");
  });

  it("sinon le serveur local", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});
