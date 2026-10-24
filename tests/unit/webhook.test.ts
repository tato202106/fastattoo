import { describe, expect, it } from "vitest";
import { computeSignature, invoiceSubscriptionId, parseSignatureHeader, toSubscriptionUpdate, verifySignature } from "@/lib/billing/webhook";

const SECRET = "whsec_test_secret";
const PAYLOAD = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated" });
const NOW = 1_800_000_000;

describe("webhook Stripe : signature", () => {
  it("lit l'en-tête Stripe-Signature", () => {
    expect(parseSignatureHeader("t=123,v1=abc,v0=zzz,v1=def")).toEqual({ timestamp: 123, signatures: ["abc", "def"] });
    expect(parseSignatureHeader("v1=abc")).toBeNull();
    expect(parseSignatureHeader("")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("accepte une signature valide et récente", () => {
    const sig = computeSignature(PAYLOAD, NOW, SECRET);
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=${sig}`, SECRET, NOW + 10)).toBe(true);
    // Plusieurs signatures (rotation du secret) : une seule suffit.
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=${"0".repeat(64)},v1=${sig}`, SECRET, NOW)).toBe(true);
  });

  it("refuse un corps modifié, un mauvais secret, un horodatage trop ancien", () => {
    const sig = computeSignature(PAYLOAD, NOW, SECRET);
    expect(verifySignature(PAYLOAD + " ", `t=${NOW},v1=${sig}`, SECRET, NOW)).toBe(false);
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=${sig}`, "whsec_autre", NOW)).toBe(false);
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=${sig}`, SECRET, NOW + 301)).toBe(false);
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=pas-hex`, SECRET, NOW)).toBe(false);
    expect(verifySignature(PAYLOAD, `t=${NOW},v1=${sig}`, "", NOW)).toBe(false);
  });
});

describe("webhook Stripe : lecture des abonnements", () => {
  it("résume un abonnement (période dans l'article, format récent de l'API)", () => {
    const u = toSubscriptionUpdate({
      id: "sub_1",
      status: "past_due",
      customer: "cus_1",
      cancel_at_period_end: true,
      items: { data: [{ current_period_end: 1_798_761_600, price: { recurring: { interval: "year" } } }] },
      metadata: { signup_id: "42" },
    });
    expect(u).toEqual({
      subscriptionId: "sub_1",
      signupId: 42,
      customerId: "cus_1",
      status: "past_due",
      plan: "annual",
      cancelAtPeriodEnd: true,
      periodEnd: "2027-01-01",
    });
  });

  it("valeurs par défaut prudentes", () => {
    const u = toSubscriptionUpdate({ id: "sub_2", status: "canceled", customer: { id: "cus_2" }, metadata: { signup_id: "abc" } });
    expect(u.signupId).toBeNull();
    expect(u.customerId).toBe("cus_2");
    expect(u.plan).toBe("monthly");
    expect(u.cancelAtPeriodEnd).toBe(false);
    expect(u.periodEnd).toBeNull();
  });

  it("trouve l'abonnement d'une facture (ancien et nouveau format)", () => {
    expect(invoiceSubscriptionId({ subscription: "sub_a" })).toBe("sub_a");
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_b" } } })).toBe("sub_b");
    expect(invoiceSubscriptionId({ subscription: { id: "sub_c" } })).toBe("sub_c");
    expect(invoiceSubscriptionId({})).toBeNull();
  });
});
