import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, isMobile, smallTapTargets, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("accueil : titre, recherche, styles, tatoueurs et navigation au pouce", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trouve ton tatoueur." })).toBeVisible();
  await expect(page.getByText("Les meilleurs artistes autour de toi.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Autour de moi/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorer les styles" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fine Line/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tatoueurs autour de toi" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir la carte/ })).toBeVisible();
  await expectNoHorizontalScroll(page);

  if (isMobile(page)) {
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    for (const label of ["Accueil", "Explorer", "Favoris", "Messages", "Profil"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
    const box = await nav.boundingBox();
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
    expect(await smallTapTargets(page, "nav a")).toEqual([]);
  }
});

test("recherche intelligente : « Fine Line Nantes » ouvre la carte filtrée", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Rechercher/ }).first().click();
  const input = page.getByPlaceholder("Ville, style ou tatoueur");
  await expect(input).toBeFocused();
  await input.fill("Fine Line Nantes");
  await expect(page.getByText("📍 Nantes")).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/explorer\?q=Fine(\+|%20)Line(\+|%20)Nantes/);
  await expect(page.getByRole("heading", { name: /\d+ tatoueurs?/ })).toBeVisible();
  await expect(page.getByText("À Nantes et alentours").first()).toBeVisible();
});

test("recherche d'un nom : « Léa » propose le profil", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Rechercher/ }).first().click();
  await page.getByPlaceholder("Ville, style ou tatoueur").fill("Léa");
  await page.getByRole("button", { name: /Léa Ink/ }).click();
  await expect(page).toHaveURL(/\/tatoueurs\/lea-ink/);
});
