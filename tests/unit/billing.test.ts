import { describe, expect, it } from "vitest";
import { ANNUAL_PERK, annualPerkIsTrue, annualSavings, formatPrice, isPlanId, PLANS, renewalDate } from "@/lib/billing/plans";
import { PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY, PRO_SIGNUP_URL, proSignupUrlFor } from "@/lib/pro-offer";

describe("forfaits tatoueur", () => {
  it("forfait annuel à 179 €", () => {
    expect(PLANS.annual.amount).toBe(17900);
    expect(formatPrice(PLANS.annual.amount)).toBe("179 €");
    expect(PLANS.monthly.amount).toBe(PRO_PRICE_MONTHLY * 100);
    expect(PLANS.annual.amount).toBe(PRO_PRICE_ANNUAL * 100);
    expect(formatPrice(1990)).toBe("19,90 €");
    expect(formatPrice(123456)).toBe("1 234,56 €");
  });

  it("économies de l'annuel par rapport au mensuel (19 €/mois)", () => {
    const s = annualSavings();
    expect(s.yearlyMonthlyCost).toBe(22800);
    expect(s.saved).toBe(4900);
    expect(s.percent).toBe(21);
    expect(s.freeMonths).toBe(2);
    expect(formatPrice(s.perMonth)).toBe("14,92 €");
  });

  it("« 1 mois offert » sur l'annuel : argument vrai (moins cher que 11 mois au mensuel)", () => {
    expect(ANNUAL_PERK).toBe("1 mois offert");
    expect(annualPerkIsTrue()).toBe(true);
    expect(PLANS.annual.amount).toBeLessThan(PLANS.monthly.amount * 11);
  });

  it("date de renouvellement", () => {
    expect(renewalDate("2026-10-17", "monthly")).toBe("2026-11-17");
    expect(renewalDate("2026-10-17", "annual")).toBe("2027-10-17");
  });

  it("valide les identifiants de forfait", () => {
    expect(isPlanId("annual")).toBe(true);
    expect(isPlanId("gold")).toBe(false);
  });
});

describe("choix du forfait sur /devenir-tatoueur", () => {
  it("chaque carte mène à l'inscription avec son forfait, reconnu au paiement", () => {
    for (const plan of ["annual", "monthly"] as const) {
      const url = new URL(proSignupUrlFor(plan), "https://fastattoo.test");
      expect(url.pathname).toBe(PRO_SIGNUP_URL);
      expect(url.searchParams.get("forfait")).toBe(plan);
      expect(isPlanId(url.searchParams.get("forfait"))).toBe(true);
    }
  });
});
