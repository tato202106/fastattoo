import { expect, test } from "@playwright/test";
import { loginAs, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("inscription tatoueur : paiement obligatoire, forfait annuel à 179 € proposé d'abord", async ({ page }) => {
  await loginAs(page, "artist", { plan: null });
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/pro\/abonnement$/);
  await expect(page.getByRole("heading", { name: "Active ton profil pro" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Annuel/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Payer 179 € pour 1 an" }).click();
  const sheet = page.getByRole("dialog", { name: "Paiement" });
  await expect(sheet.getByText("Mode démonstration")).toBeVisible();
  await sheet.getByRole("button", { name: /Payer 179 €/ }).click();
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
  await expect(sheet.getByText("3 mois offerts")).toBeInViewport();
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

test("API de paiement : mode démo sans clé Stripe", async ({ page }) => {
  const res = await page.request.get("/api/billing/config");
  expect(await res.json()).toEqual({ mode: "demo" });
  const checkout = await page.request.post("/api/billing/checkout", { data: { plan: "annual" } });
  expect(checkout.status()).toBe(409);
});
