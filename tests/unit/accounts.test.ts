import { describe, expect, it } from "vitest";
import { artistIdFor, artistSlugFor, autoPublishDecision, cleanInstagram, missingForSubmission, parseProfile, subscriptionEnded, toArtistRow } from "@/lib/accounts/profile";
import { adminToken, checkAdminPassword, verifyAdminToken } from "@/lib/auth/admin";
import { hashPassword, isTokenFormat, newToken, passwordError, tokenHash, verifyPassword } from "@/lib/auth/password";

describe("comptes tatoueurs : mots de passe", () => {
  it("hache et vérifie un mot de passe", () => {
    const stored = hashPassword("encre-noire-2026");
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(stored).not.toContain("encre-noire-2026");
    expect(verifyPassword("encre-noire-2026", stored)).toBe(true);
    expect(verifyPassword("encre-noire-2027", stored)).toBe(false);
    // Sel aléatoire : deux hachages du même mot de passe diffèrent.
    expect(hashPassword("encre-noire-2026")).not.toBe(stored);
  });

  it("refuse un hachage absent ou mal formé", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "md5$abc")).toBe(false);
    expect(verifyPassword("x", "scrypt$16384$8$1$sel$")).toBe(false);
  });

  it("longueur minimale du mot de passe", () => {
    expect(passwordError("court")).toMatch(/au moins 8/);
    expect(passwordError(undefined)).toMatch(/au moins 8/);
    expect(passwordError("assez-long")).toBeNull();
  });

  it("jetons : aléatoires, empreinte stable, format vérifié", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
    expect(isTokenFormat(a)).toBe(true);
    expect(isTokenFormat("abc")).toBe(false);
    expect(isTokenFormat(`${a.slice(0, 42)}!`)).toBe(false);
    expect(tokenHash(a)).toHaveLength(64);
    expect(tokenHash(a)).toBe(tokenHash(a));
    expect(tokenHash(a)).not.toBe(tokenHash(b));
  });
});

describe("comptes tatoueurs : profil", () => {
  it("valide et nettoie le profil", () => {
    const r = parseProfile({
      name: "  Nora Ink ",
      title: "Tatoueuse",
      city: "Nantes",
      styles: ["fine-line", "fine-line", "inconnu"],
      priceFrom: "80",
      hourlyRate: "120,4",
      bio: "Fine line et floral depuis 2018.",
      instagram: "https://www.instagram.com/nora.ink/?hl=fr",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ name: "Nora Ink", title: "Tatoueuse", styles: ["fine-line"], priceFrom: 80, hourlyRate: 120, instagram: "nora.ink" });
  });

  it("signale les champs obligatoires", () => {
    const r = parseProfile({ title: "Pirate", styles: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["city", "name", "styles"]);
  });

  it("titre inconnu → Tatoueur, Instagram nettoyé", () => {
    const r = parseProfile({ name: "A", city: "Lyon", styles: ["dotwork"], title: "Pirate" });
    expect(r.ok && r.value.title).toBe("Tatoueur");
    expect(cleanInstagram("@studio_lune")).toBe("studio_lune");
  });

  it("liste ce qui manque avant l'envoi pour validation", () => {
    expect(missingForSubmission({ name: "Nora", city: "Nantes", lat: 47.2, lng: -1.5, styles: ["floral"], priceFrom: 80, bio: "x".repeat(30) })).toEqual([]);
    expect(missingForSubmission({ name: "Nora", city: "Nantes", lat: null, lng: null, styles: [], priceFrom: null, bio: "court" })).toHaveLength(4);
  });

  it("identifiant et slug de profil stables et uniques", () => {
    expect(artistIdFor(7)).toBe("acc-7");
    expect(artistSlugFor(7, "Nora Ink", "Saint-Herblain")).toBe("nora-ink-saint-herblain-7");
    expect(artistSlugFor(8, "!!!", "")).toBe("tatoueur-8");
  });

  it("ligne de la table artists pour la publication", () => {
    const row = toArtistRow({
      id: 7,
      name: "Nora Ink",
      title: "Tatoueuse",
      studio: "Studio Lune",
      address: "3 rue de la Paix",
      city: "Nantes",
      styles: ["floral", "fine-line"],
      priceFrom: 80,
      hourlyRate: null,
      bio: "Floral",
      instagram: "",
      lat: 47.2,
      lng: -1.55,
    });
    expect(row).toMatchObject({ id: "acc-7", slug: "nora-ink-nantes-7", city_slug: "nantes", price_from: 80, hourly_rate: 80, instagram: null });
    expect(row.avatar.base).toBe("/media/avatar/10007/NI");
    expect(row.cover.base).toBe("/media/art/floral/10007");
  });
});

describe("accès admin", () => {
  it("cookie signé, expirant, lié au mot de passe", () => {
    const now = 1_800_000_000_000;
    const token = adminToken("motdepasse-admin", now);
    expect(verifyAdminToken("motdepasse-admin", token, now + 1000)).toBe(true);
    expect(verifyAdminToken("autre-mot-de-passe", token, now + 1000)).toBe(false);
    expect(verifyAdminToken("motdepasse-admin", token, now + 13 * 3600_000)).toBe(false);
    expect(verifyAdminToken("motdepasse-admin", `${now + 3600_000}.${"0".repeat(64)}`, now)).toBe(false);
    expect(verifyAdminToken(undefined, token, now)).toBe(false);
    expect(checkAdminPassword("motdepasse-admin", "motdepasse-admin")).toBe(true);
    expect(checkAdminPassword("motdepasse-admin", "motdepasse")).toBe(false);
    expect(checkAdminPassword(undefined, "x")).toBe(false);
  });
});

describe("publication automatique du profil", () => {
  const base = { status: "draft" as const, paid: true, lat: 47.2, lng: -1.55 };

  it("abonné : publié directement, sans photo ni validation", () => {
    expect(autoPublishDecision(base)).toBe("publish");
    expect(autoPublishDecision({ ...base, status: "submitted" })).toBe("publish");
  });

  it("pas abonné, déjà en ligne ou retiré par l'équipe : rien à faire", () => {
    expect(autoPublishDecision({ ...base, paid: false })).toBe("skip");
    expect(autoPublishDecision({ ...base, status: "published" })).toBe("skip");
    expect(autoPublishDecision({ ...base, status: "hidden" })).toBe("skip");
  });

  it("sans localisation : il faut l'adresse pour apparaître sur la carte", () => {
    expect(autoPublishDecision({ ...base, lat: null, lng: null })).toBe("needs-location");
  });

  it("abonnement terminé : le profil quitte la carte", () => {
    for (const s of ["canceled", "unpaid", "incomplete_expired", "paused"]) expect(subscriptionEnded(s)).toBe(true);
    for (const s of [null, "active", "trialing", "past_due", "incomplete"]) expect(subscriptionEnded(s)).toBe(false);
  });
});

describe("comptes tatoueurs : pays", () => {
  it("garde le pays choisi dans le profil (France par défaut)", () => {
    const be = parseProfile({ name: "A", city: "Mons", country: "BE", styles: ["dotwork"] });
    const fr = parseProfile({ name: "A", city: "Lyon", styles: ["dotwork"] });
    expect(be.ok && be.value.country).toBe("BE");
    expect(fr.ok && fr.value.country).toBe("FR");
  });
});
