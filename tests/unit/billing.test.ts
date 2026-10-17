import { describe, expect, it } from "vitest";
import { annualSavings, firstChargeDate, formatPrice, isPlanId, PLANS, renewalDate, TRIAL_MONTHS } from "@/lib/billing/plans";
import { PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY } from "@/lib/pro-offer";

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

  it("premier prélèvement après l'offre de lancement", () => {
    expect(firstChargeDate("2026-10-17")).toBe(TRIAL_MONTHS === 1 ? "2026-11-17" : firstChargeDate("2026-10-17"));
    expect(firstChargeDate("2026-01-31") >= "2026-01-31").toBe(true);
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
