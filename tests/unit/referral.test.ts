import { describe, expect, it } from "vitest";
import { isSponsorActive, referralPath, toISODate } from "@/lib/referral";

describe("referral", () => {
  it("mise en avant active jusqu'à la date incluse", () => {
    expect(isSponsorActive("2026-11-13", "2026-11-13")).toBe(true);
    expect(isSponsorActive("2026-11-12", "2026-11-13")).toBe(false);
    expect(isSponsorActive(undefined, "2026-11-13")).toBe(false);
  });
  it("normalise les dates de la base", () => {
    expect(toISODate(new Date("2026-11-13T00:00:00Z"))).toBe("2026-11-13");
    expect(toISODate("2026-11-13")).toBe("2026-11-13");
    expect(toISODate(null)).toBeUndefined();
  });
  it("construit le lien de parrainage", () => {
    expect(referralPath("@lea ink")).toBe("/devenir-tatoueur/inscription?parrain=%40lea%20ink");
  });
});
