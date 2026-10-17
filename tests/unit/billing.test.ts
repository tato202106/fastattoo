import { describe, expect, it } from "vitest";
import { annualSavings, formatPrice, isPlanId, PLANS, renewalDate } from "@/lib/billing/plans";

describe("forfaits tatoueur", () => {
  it("forfait annuel à 179 €", () => {
    expect(PLANS.annual.amount).toBe(17900);
    expect(formatPrice(PLANS.annual.amount)).toBe("179 €");
    expect(formatPrice(PLANS.monthly.amount)).toBe("19,90 €");
    expect(formatPrice(123456)).toBe("1 234,56 €");
  });

  it("économies de l'annuel par rapport au mensuel", () => {
    const s = annualSavings();
    expect(s.yearlyMonthlyCost).toBe(23880);
    expect(s.saved).toBe(5980);
    expect(s.percent).toBe(25);
    expect(s.freeMonths).toBe(3);
    expect(formatPrice(s.perMonth)).toBe("14,92 €");
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
