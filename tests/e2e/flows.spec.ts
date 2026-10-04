import { expect, test } from "@playwright/test";
import { loginAs, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("formulaire projet : 8 étapes avec progression, puis conversation", async ({ page }) => {
  await page.goto("/tatoueurs/lea-ink/demande");
  const next = page.getByRole("button", { name: "Continuer" });
  await expect(page.getByText("1 / 8")).toBeVisible();
  await page.getByLabel("Décris ton projet").fill("Une petite branche d'olivier sur l'avant-bras");
  await next.click();
  await expect(page.getByText("2 / 8")).toBeVisible();
  await next.click(); // style présélectionné (spécialité)
  await page.getByRole("button", { name: "Avant-bras" }).click();
  await page.getByRole("button", { name: /^Moyen/ }).click();
  await page.getByRole("button", { name: /200 – 300 €/ }).click();
  await expect(page.getByText("6 / 8")).toBeVisible();
  await page.getByRole("button", { name: /Je suis flexible/ }).click();
  await next.click();
  await expect(page.getByText("7 / 8")).toBeVisible();
  await page.getByRole("button", { name: "Passer" }).click();
  await expect(page.getByText("8 / 8")).toBeVisible();
  await page.getByPlaceholder("Ton prénom").fill("Thomas");
  await page.getByPlaceholder("Ton e-mail").fill("thomas@example.com");
  await page.getByRole("button", { name: /Envoyer ma demande/ }).click();
  await expect(page).toHaveURL(/\/messages\/c-r-/);
  await expect(page.getByText(/Demande envoyée à Léa Ink/)).toBeVisible();
  await expect(page.getByText("Une petite branche d'olivier sur l'avant-bras")).toBeVisible();
});

test("client : accepter une proposition de créneau → rendez-vous confirmé", async ({ page }) => {
  await loginAs(page, "client");
  await page.goto("/messages/c-r2");
  await expect(page.getByText("Proposition de rendez-vous")).toBeVisible();
  await page.getByRole("button", { name: "Accepter" }).click();
  await expect(page.getByText("Confirmé", { exact: true })).toBeVisible();
  await expect(page.getByText("Rendez-vous confirmé").last()).toBeVisible();
});

test("messagerie : envoyer un message texte", async ({ page }) => {
  await loginAs(page, "client");
  await page.goto("/messages/c-r1");
  await page.getByLabel("Message").fill("Merci, à tout à l'heure !");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Merci, à tout à l'heure !")).toBeVisible();
});

test("tatoueur : dashboard, demande, proposer un créneau", async ({ page }) => {
  await loginAs(page, "artist");
  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: /Bonjour Léa/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Demandes/ }).first()).toBeVisible();
  await page.goto("/pro/demandes");
  await page.getByRole("link", { name: /Camille/ }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/r4/);
  await page.getByRole("button", { name: /Proposer un créneau/ }).click();
  const sheet = page.getByRole("dialog", { name: "Proposer un créneau" });
  await sheet.getByRole("button", { name: /^\d{2}h\d{2}$/ }).first().click();
  await sheet.getByRole("button", { name: "Envoyer la proposition" }).click();
  await expect(page).toHaveURL(/\/messages\/c-r4/);
  await expect(page.getByText("En attente de réponse…")).toBeVisible();
});

test("tatoueur : bloquer un créneau en un tap", async ({ page }) => {
  await loginAs(page, "artist");
  await page.goto("/pro/calendrier");
  await page.getByRole("button", { name: "Cette semaine" }).click();
  const free = page.getByRole("button", { name: /Disponible/ }).first();
  await free.click();
  await expect(page.getByRole("button", { name: /Bloqué/ }).first()).toBeVisible();
});

test("favoris : ajout depuis le profil, visible dans l'onglet", async ({ page }) => {
  await page.goto("/tatoueurs/yanis-real");
  await page.getByRole("button", { name: /Ajouter Yanis Real aux favoris/ }).first().click();
  await page.goto("/favoris");
  await expect(page.getByRole("heading", { name: /Yanis Real/ })).toBeVisible();
});

test("PWA : manifest et service worker disponibles", async ({ page }) => {
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).toContain('addEventListener("push"');
});
