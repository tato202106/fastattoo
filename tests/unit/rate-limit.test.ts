import { describe, expect, it } from "vitest";
import { allowed, clientIp, LIMITS, limitKey, sameOrigin } from "@/lib/rate-limit";

describe("limites anti-abus", () => {
  it("lit l'adresse IP du visiteur", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("inconnue");
  });

  it("ne stocke jamais l'adresse elle-même, et ignore la casse des e-mails", () => {
    const key = limitKey("reset-email", "Lea@Exemple.fr ");
    expect(key).toMatch(/^reset-email:[0-9a-f]{32}$/);
    expect(key).not.toContain("lea");
    expect(limitKey("reset-email", "lea@exemple.fr")).toBe(key);
    expect(limitKey("reset-ip", "lea@exemple.fr")).not.toBe(key);
  });

  it("autorise jusqu'au maximum, puis bloque", () => {
    expect(allowed(LIMITS.admin.max, LIMITS.admin)).toBe(true);
    expect(allowed(LIMITS.admin.max + 1, LIMITS.admin)).toBe(false);
  });

  it("refuse les envois de photos venant d'un autre site", () => {
    const url = "https://fastattoo.vercel.app/api/uploads";
    expect(sameOrigin(new Headers({ origin: "https://fastattoo.vercel.app" }), url)).toBe(true);
    expect(sameOrigin(new Headers({ origin: "https://autre-site.com" }), url)).toBe(false);
    expect(sameOrigin(new Headers({ origin: "pas une url" }), url)).toBe(false);
    expect(sameOrigin(new Headers(), url)).toBe(true);
  });
});
