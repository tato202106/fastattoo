import { describe, expect, it } from "vitest";
import { gateDecision, hasPaidAccess, isPaymentExempt, needsPaymentFix, PAYMENT_PATH, requiresPayment } from "@/lib/billing/access";

describe("accès selon l'abonnement", () => {
  it("statuts qui donnent accès", () => {
    for (const s of ["active", "trialing", "past_due"]) expect(hasPaidAccess(s)).toBe(true);
    for (const s of [null, undefined, "", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) expect(hasPaidAccess(s)).toBe(false);
  });

  it("abonnement à régulariser via le portail plutôt qu'un nouveau paiement", () => {
    expect(needsPaymentFix("unpaid")).toBe(true);
    expect(needsPaymentFix("incomplete")).toBe(true);
    expect(needsPaymentFix("canceled")).toBe(false);
    expect(needsPaymentFix(null)).toBe(false);
  });

  it("pages accessibles sans avoir payé", () => {
    expect(isPaymentExempt(PAYMENT_PATH)).toBe(true);
    expect(isPaymentExempt("/devenir-tatoueur/inscription/confirmation")).toBe(true);
    expect(isPaymentExempt("/espace-tatoueur/connexion")).toBe(true);
    expect(isPaymentExempt("/espace-tatoueur")).toBe(false);
    expect(isPaymentExempt("/")).toBe(false);
    expect(isPaymentExempt("/devenir-tatoueur/paiementX")).toBe(false);
  });

  it("seul l'espace tatoueur exige un abonnement, le site public reste ouvert", () => {
    expect(requiresPayment("/espace-tatoueur")).toBe(true);
    expect(requiresPayment("/espace-tatoueur/abonnement")).toBe(true);
    expect(requiresPayment("/espace-tatoueur/connexion")).toBe(false);
    expect(requiresPayment("/espace-tatoueur/mot-de-passe-oublie")).toBe(false);
    for (const p of ["/", "/explorer", "/tatoueur/lea", "/devenir-tatoueur", "/devenir-tatoueur/inscription", PAYMENT_PATH, "/espace-tatoueurX"]) {
      expect(requiresPayment(p)).toBe(false);
    }
  });

  it("décision du proxy", () => {
    const base = { enabled: true, pathname: "/espace-tatoueur" };
    expect(gateDecision({ ...base, status: undefined })).toBe("allow"); // visiteur
    expect(gateDecision({ ...base, status: null })).toBe("pay"); // inscrit, pas payé
    expect(gateDecision({ ...base, status: "canceled" })).toBe("pay");
    expect(gateDecision({ ...base, status: "trialing" })).toBe("allow");
    expect(gateDecision({ ...base, pathname: "/", status: null })).toBe("allow"); // l'accueil reste ouvert
    expect(gateDecision({ ...base, pathname: "/explorer", status: null })).toBe("allow");
    expect(gateDecision({ ...base, pathname: PAYMENT_PATH, status: null })).toBe("allow");
    expect(gateDecision({ enabled: false, pathname: "/", status: null })).toBe("allow"); // Stripe non configuré
  });
});
