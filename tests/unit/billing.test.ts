import { describe, expect, it } from "vitest";
import { annualSavings, firstChargeDate, formatPrice, isPlanId, PLANS, renewalDate, TRIAL_DAYS, TRIAL_LABEL } from "@/lib/billing/plans";
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
    // Offre de lancement : 1 semaine offerte = 7 jours d'essai Stripe.
    expect(TRIAL_DAYS).toBe(7);
    expect(TRIAL_LABEL).toBe("1 semaine offerte");
    expect(firstChargeDate("2026-10-17")).toBe("2026-10-24");
    expect(firstChargeDate("2026-12-28")).toBe("2027-01-04");
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
