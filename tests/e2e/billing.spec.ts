import { expect, test } from "@playwright/test";
import { loginAs, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("inscription tatoueur : paiement obligatoire, forfait annuel à 179 € proposé d'abord", async ({ page }) => {
  await loginAs(page, "artist", { plan: null });
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/pro\/abonnement$/);
  await expect(page.getByRole("heading", { name: "Active ton profil pro" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Annuel/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("🎁 1 mois offert").first()).toBeVisible();
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

test("inscription : à la fin du formulaire, direction la page de paiement obligatoire", async ({ page }) => {
  // API simulée : la base Neon n'est pas disponible pendant les tests.
  let signupBody: Record<string, unknown> | null = null;
  await page.route("**/api/inscriptions-tatoueurs", async (r) => {
    signupBody = r.request().postDataJSON() as Record<string, unknown>;
    await r.fulfill({ json: { ok: true, signupId: 42 } });
  });

  await page.goto("/devenir-tatoueur");
  await expect(page.getByText("179 €", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Je m'inscris" }).first().click();
  await page.getByLabel("Nom ou nom d'artiste").fill("Nora Ink");
  await page.getByLabel("Ville").fill("Nantes");
  await page.getByLabel("E-mail").fill("nora@example.com");
  await page.getByLabel("Mot de passe").fill("encre-noire-2026");
  await page.getByRole("button", { name: "Fine Line" }).click();
  await page.getByRole("checkbox").check();
  const toPayment = page.waitForRequest((r) => r.url().includes("/devenir-tatoueur/paiement?inscription=1"));
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await toPayment;
  expect(signupBody).toMatchObject({ name: "Nora Ink", email: "nora@example.com", styles: ["fine-line"], consent: true });
  // Sans compte réellement connecté (pas de base en test), la page de paiement exige une connexion.
  await expect(page).toHaveURL(/\/espace-tatoueur\/connexion$/);
});

test("page de paiement : réservée à un compte tatoueur connecté", async ({ page }) => {
  await page.goto("/devenir-tatoueur/paiement");
  await expect(page).toHaveURL(/\/espace-tatoueur\/connexion$/);
  const checkout = await page.request.post("/api/billing/checkout", { data: { plan: "annual" } });
  expect([401, 409]).toContain(checkout.status()); // 409 si Stripe n'est pas configuré
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
