import { describe, expect, it } from "vitest";
import { billingDiagnostics, stripeConfigured, stripePlanRef, stripeSecretKey, stripeWebhookSecret } from "@/lib/billing/env";

describe("variables Stripe", () => {
  it("accepte les noms courants de la clé secrète", () => {
    expect(stripeSecretKey({ STRIPE_SECRET_KEY: "sk_live_abc" })).toBe("sk_live_abc");
    expect(stripeSecretKey({ STRIPE_API_KEY: "sk_test_abc" })).toBe("sk_test_abc");
    expect(stripeSecretKey({ STRIPE_KEY: ' "rk_live_abc" ' })).toBe("rk_live_abc");
    expect(stripeConfigured({})).toBe(false);
  });

  it("clé restreinte (rk_) sous n'importe quel nom de variable Stripe", () => {
    expect(stripeSecretKey({ STRIPE_RESTRICTED_KEY: "rk_live_abc" })).toBe("rk_live_abc");
    expect(stripeSecretKey({ MA_CLE_STRIPE: "rk_live_abc", STRIPE_PUBLISHABLE_KEY: "pk_live_x" })).toBe("rk_live_abc");
    expect(stripeSecretKey({ STRIPE_TEST: "sk_test_a", STRIPE_PROD: "rk_live_b" })).toBe("rk_live_b");
    expect(stripeSecretKey({ STRIPE_SECRET_KEY: "pk_live_x", STRIPE_RK_LIVE: "rk_live_b" })).toBe("rk_live_b");
    expect(stripeSecretKey({ OTHER_KEY: "sk_live_a" })).toBeNull();
    const d = billingDiagnostics({ STRIPE_RESTRICTED_KEY: "rk_live_abc" });
    expect(d.secretKey).toMatchObject({ ok: true, mode: "live", restricted: true });
    expect(stripeWebhookSecret({ STRIPE_WH: "whsec_y" })).toBe("whsec_y");
  });

  it("refuse une clé publique à la place de la clé secrète, avec un message clair", () => {
    expect(stripeSecretKey({ STRIPE_SECRET_KEY: "pk_live_abc" })).toBeNull();
    const d = billingDiagnostics({ STRIPE_SECRET_KEY: "pk_live_abc" });
    expect(d.secretKey.ok).toBe(false);
    expect(d.secretKey.problem).toContain("clé publique");
  });

  it("prix ou produit Stripe pour chaque forfait", () => {
    expect(stripePlanRef("annual", { STRIPE_PRICE_YEARLY: "price_123" })).toEqual({ kind: "price", id: "price_123" });
    expect(stripePlanRef("monthly", { STRIPE_PRICE_MONTHLY: "prod_456" })).toEqual({ kind: "product", id: "prod_456" });
    expect(stripePlanRef("monthly", { STRIPE_PRICE_MONTHLY: "19" })).toBeNull();
    expect(billingDiagnostics({ STRIPE_PRICE_MONTHLY: "19" }).prices.monthly.problem).toContain("price_");
  });

  it("secret de webhook et mode test/live", () => {
    expect(stripeWebhookSecret({ STRIPE_WEBHOOK_SECRET: "whsec_x" })).toBe("whsec_x");
    expect(stripeWebhookSecret({ STRIPE_WEBHOOK_SECRET: "x" })).toBeNull();
    const d = billingDiagnostics({ STRIPE_SECRET_KEY: "sk_live_a", DATABASE_URL: "postgres://x" });
    expect(d.secretKey).toMatchObject({ ok: true, variable: "STRIPE_SECRET_KEY", mode: "live" });
    expect(d.database).toBe(true);
  });
});
