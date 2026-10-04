import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, isMobile, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("profil : identité, portfolio, CTA toujours accessible", async ({ page }) => {
  await page.goto("/tatoueurs/lea-ink");
  await expect(page.getByRole("heading", { level: 1, name: "Léa Ink" })).toBeVisible();
  await expect(page.getByText("Tatoueuse · Nantes").first()).toBeVisible();
  await expect(page.getByText("Vérifiée").first()).toBeVisible();
  await expectNoHorizontalScroll(page);
  const cta = page.getByRole("link", { name: "Demander un projet" }).first();
  await expect(cta).toBeInViewport();
  if (isMobile(page)) {
    await page.getByRole("heading", { name: /Avis/ }).scrollIntoViewIfNeeded();
    await expect(cta).toBeInViewport();
  }
  for (const s of ["Styles", "À propos", "Localisation", "Prix", "Disponibilités"]) {
    await expect(page.getByRole("heading", { name: s, exact: true })).toBeAttached();
  }
});

test("portfolio : plein écran, navigation et fermeture", async ({ page }) => {
  await page.goto("/tatoueurs/lea-ink");
  await page.getByRole("button", { name: /^Agrandir/ }).first().click();
  const viewer = page.getByRole("dialog", { name: "Portfolio en plein écran" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText(/^1 \/ \d+$/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText(/^2 \/ \d+$/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("images : AVIF/WebP en srcset, lazy loading, dimensions fixes", async ({ page }) => {
  await page.goto("/tatoueurs/lea-ink");
  const sources = page.locator("picture source[type='image/avif']");
  expect(await sources.count()).toBeGreaterThan(4);
  const lazy = await page.locator("picture img[loading='lazy']").count();
  expect(lazy).toBeGreaterThan(3);
  const missing = await page.locator("picture img:not([width]), picture img:not([height])").count();
  expect(missing).toBe(0);
  const res = await page.request.get("/media/art/floral/101/thumbnail.avif");
  expect(res.headers()["content-type"]).toBe("image/avif");
  expect(res.headers()["cache-control"]).toContain("immutable");
});
