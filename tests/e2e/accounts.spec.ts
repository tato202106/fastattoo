import { expect, test } from "@playwright/test";

test("espace tatoueur : non connecté → page de connexion", async ({ page }) => {
  await page.goto("/espace-tatoueur");
  await expect(page).toHaveURL(/\/espace-tatoueur\/connexion$/);
  await expect(page.getByRole("heading", { name: "Espace tatoueur" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible();
});

test("espace tatoueur : identifiants refusés sans révéler le compte", async ({ page }) => {
  const res = await page.request.post("/api/compte/connexion", { data: { email: "", password: "" } });
  expect(res.status()).toBe(401);
  const profile = await page.request.put("/api/compte/profil", { data: { name: "X" } });
  expect(profile.status()).toBe(401);
});

test("admin : désactivé sans ADMIN_PASSWORD", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText(/ADMIN_PASSWORD/).first()).toBeVisible();
  const res = await page.request.post("/api/admin/comptes/1", { data: { action: "publish" } });
  expect(res.status()).toBe(401);
});
