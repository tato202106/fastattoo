import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Call = { method: string; url: string; body: URLSearchParams };

/** Faux Stripe : refuse le prix inconnu, connaît un prix live à 179 €/an. */
function fakeStripe(calls: Call[]) {
  return vi.fn(async (url: string, init: RequestInit) => {
    const body = new URLSearchParams(typeof init.body === "string" ? init.body : "");
    calls.push({ method: init.method ?? "GET", url, body });
    const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
    if (url.includes("/prices?")) {
      return json(200, { data: [{ id: "price_live_annual", active: true, unit_amount: 17900, currency: "eur", recurring: { interval: "year" } }] });
    }
    if (url.endsWith("/checkout/sessions")) {
      if (body.get("line_items[0][price]") === "price_test_inconnu") {
        return json(400, { error: { message: "No such price: 'price_test_inconnu'" } });
      }
      return json(200, { id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" });
    }
    return json(404, { error: { message: "inattendu" } });
  });
}

const checkout = { plan: "annual" as const, reference: "account-1", accountId: 1, origin: "https://fastattoo.com", successPath: "/ok", cancelPath: "/ko" };

describe("paiement Stripe : prix de la variable inconnu du compte", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("réessaie avec le prix retrouvé dans le compte (mode live)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_x");
    vi.stubEnv("STRIPE_PRICE_ANNUAL", "price_test_inconnu");
    const calls: Call[] = [];
    vi.stubGlobal("fetch", fakeStripe(calls));
    const { createCheckoutSession } = await import("@/lib/billing/stripe");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const session = await createCheckoutSession(checkout);

    expect(session.url).toContain("checkout.stripe.com");
    const posts = calls.filter((c) => c.url.endsWith("/checkout/sessions"));
    expect(posts).toHaveLength(2);
    expect(posts[1]?.body.get("line_items[0][price]")).toBe("price_live_annual");
    expect(posts[1]?.body.get("subscription_data[metadata][account_id]")).toBe("1");
  });

  it("sans prix configuré, utilise le prix existant au bon montant", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_x");
    const calls: Call[] = [];
    vi.stubGlobal("fetch", fakeStripe(calls));
    const { createCheckoutSession } = await import("@/lib/billing/stripe");

    await createCheckoutSession(checkout);

    const post = calls.find((c) => c.url.endsWith("/checkout/sessions"));
    expect(post?.body.get("line_items[0][price]")).toBe("price_live_annual");
  });
});
