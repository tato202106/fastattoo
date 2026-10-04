import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, isMobile, stubTiles } from "./helpers";

test.beforeEach(async ({ page }) => stubTiles(page));

test("carte : marqueurs, sélection synchronisée et bottom sheet", async ({ page }) => {
  await page.goto("/explorer?q=Nantes");
  await expect(page.getByRole("heading", { name: /\d+ tatoueurs/ })).toBeVisible();
  const markers = page.locator(".ft-marker");
  await expect(markers.first()).toBeVisible();
  const count = await markers.count();
  expect(count).toBeGreaterThan(2);
  await expectNoHorizontalScroll(page);

  // Tap sur un marqueur → la card correspondante est sélectionnée.
  const target = markers.nth(count - 1);
  const label = (await target.getAttribute("aria-label"))!.split(",")[0]!;
  await target.click();
  await expect(target).toHaveAttribute("data-selected", "true");
  if (isMobile(page)) {
    const card = page.getByRole("list", { name: "Tatoueurs sur la carte" }).locator("article", { hasText: label });
    await expect(card).toBeInViewport();
  } else {
    await expect(page.locator("aside article", { hasText: label })).toBeInViewport();
  }
});

test("bottom sheet : agrandir puis revenir à la carte (mobile)", async ({ page }) => {
  test.skip(!isMobile(page), "mobile uniquement");
  await page.goto("/explorer?q=Lyon");
  const handle = page.getByRole("button", { name: "Agrandir la liste" });
  await handle.click();
  await expect(page.getByRole("button", { name: /centrer sur la carte/ }).first()).toBeVisible();
  await handle.click();
  await page.getByRole("button", { name: "Carte", exact: true }).click();
  await expect(page.getByRole("list", { name: "Tatoueurs sur la carte" })).toBeVisible();
});

test("filtres : compteur en direct et application", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByRole("button", { name: /Filtrer/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filtres" });
  const apply = dialog.getByRole("button", { name: /^Afficher \d+ tatoueurs?$/ });
  await expect(apply).toHaveText("Afficher 30 tatoueurs");
  await dialog.getByRole("button", { name: "Réalisme" }).click();
  await expect(apply).not.toHaveText("Afficher 30 tatoueurs");
  const text = await apply.textContent();
  await apply.click();
  await expect(page).toHaveURL(/styles=realisme/);
  const n = Number(text!.match(/\d+/)![0]);
  await expect(page.getByRole("heading", { name: new RegExp(`^${n} tatoueurs?`) })).toBeVisible();
});

test("géolocalisation : position arrondie, jamais dans l'URL", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47.218371, longitude: -1.553621 });
  const sent: string[] = [];
  page.on("request", (r) => r.url().includes("/api/artists/search") && sent.push(r.url()));
  await page.goto("/explorer?autour=1");
  await expect(page.getByRole("heading", { name: /tatoueurs? autour/ })).toBeVisible();
  await expect(page).not.toHaveURL(/lat=|lng=|autour=/);
  const withPos = sent.filter((u) => u.includes("lat="));
  expect(withPos.length).toBeGreaterThan(0);
  for (const u of withPos) {
    const p = new URL(u).searchParams;
    expect(p.get("lat")).toBe("47.22");
    expect(p.get("lng")).toBe("-1.55");
  }
});

test("géolocalisation refusée : message clair, la recherche reste utilisable", async ({ page }) => {
  // Simule le refus de l'utilisateur (Playwright ne sait qu'accorder des permissions).
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" } as GeolocationPositionError);
  });
  await page.goto("/explorer");
  await page.getByRole("button", { name: "Autour de moi" }).click();
  await expect(page.getByText(/Position refusée/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /\d+ tatoueurs/ })).toBeVisible();
});
