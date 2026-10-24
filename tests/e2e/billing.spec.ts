import { expect, test } from "@playwright/test";
import { loginAs, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("inscription tatoueur : paiement obligatoire, forfait annuel à 179 € proposé d'abord", async ({ page }) => {
  await loginAs(page, "artist", { plan: null });
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/pro\/abonnement$/);
  await expect(page.getByRole("heading", { name: "Active ton profil pro" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Annuel/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("puis 179 € / an")).toBeVisible();
  await page.getByRole("button", { name: "Commencer — 1 semaine offerte" }).click();
  const sheet = page.getByRole("dialog", { name: "Paiement" });
  await expect(sheet.getByText("Mode démonstration")).toBeVisible();
  await sheet.getByRole("button", { name: /Commencer — 1 semaine offerte/ }).click();
  await expect(page).toHaveURL(/\/pro\?bienvenue=1/);
  await expect(page.getByRole("link", { name: "Pro · Annuel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Passe à l'annuel" })).toHaveCount(0);
});

test("abonné mensuel : slides pour passer à l'annuel, puis passage à 179 €", async ({ page }) => {
  await loginAs(page, "artist", { plan: "monthly" });
  await page.goto("/pro");
  const sheet = page.getByRole("dialog", { name: "Économise avec l'annuel" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("179 € pour 12 mois")).toBeVisible();
  await expect(sheet.getByRole("region", { name: "Avantages du forfait annuel" })).toBeVisible();
  await sheet.getByRole("button", { name: "Slide 2" }).click();
  await expect(sheet.getByText("49 € d'économie")).toBeInViewport();
  await sheet.getByRole("button", { name: "Plus tard" }).click();
  await expect(sheet).toBeHidden();

  // Les slides restent dans le dashboard.
  await expect(page.getByRole("heading", { name: "Passe à l'annuel" })).toBeVisible();
  await page.getByRole("link", { name: /Passer à l'annuel — 179 €/ }).click();
  await expect(page).toHaveURL(/\/pro\/abonnement\?plan=annual/);
  await page.getByRole("button", { name: /Passer à l'annuel — 179 €/ }).click();
  await page.getByRole("dialog", { name: "Passer au forfait annuel" }).getByRole("button", { name: /Payer 179 €/ }).click();
  await expect(page.getByText("Annuel · 179 € / an")).toBeVisible();
  await expect(page.getByText(/Tu profites déjà du meilleur tarif/)).toBeVisible();
});

test("inscription réelle : formulaire → choix du forfait (annuel par défaut) → paiement Stripe", async ({ page }) => {
  // API simulées : base Neon et Stripe ne sont pas disponibles pendant les tests.
  await page.route("**/api/inscriptions-tatoueurs", (r) => r.fulfill({ json: { ok: true, signupId: 42 } }));
  await page.route("**/api/billing/config", (r) => r.fulfill({ json: { mode: "stripe", hasSubscription: false } }));
  let checkoutBody: Record<string, unknown> | null = null;
  await page.route("**/api/billing/checkout", async (r) => {
    checkoutBody = r.request().postDataJSON() as Record<string, unknown>;
    await r.fulfill({ json: { url: "/devenir-tatoueur?stripe=simule" } });
  });

  await page.goto("/devenir-tatoueur");
  await expect(page.getByText("179 €", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Je m'inscris" }).first().click();
  await page.getByLabel("Nom ou nom d'artiste").fill("Nora Ink");
  await page.getByLabel("Ville").fill("Nantes");
  await page.getByLabel("E-mail").fill("nora@example.com");
  await page.getByRole("button", { name: "Fine Line" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Envoyer mon inscription" }).click();

  await expect(page.getByRole("heading", { name: "Dernière étape : active ton profil" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Annuel/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /Commencer — 1 semaine offerte/ }).click();
  await expect(page).toHaveURL(/stripe=simule/);
  expect(checkoutBody).toEqual({ plan: "annual", email: "nora@example.com", signupId: 42 });
});

test("mon abonnement : sans abonnement sur l'appareil", async ({ page }) => {
  await page.goto("/mon-abonnement");
  await expect(page.getByText("Aucun abonnement sur cet appareil")).toBeVisible();
});

test("API de paiement : mode démo sans clé Stripe", async ({ page }) => {
  const res = await page.request.get("/api/billing/config");
  expect(await res.json()).toEqual({ mode: "demo", hasSubscription: false });
  const checkout = await page.request.post("/api/billing/checkout", { data: { plan: "annual" } });
  expect(checkout.status()).toBe(409);
});
