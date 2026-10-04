import { expect, type Page } from "@playwright/test";

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

/** Les tuiles de carte externes sont neutralisées : les tests ne dépendent pas du réseau. */
export async function stubTiles(page: Page) {
  await page.route(/basemaps\.cartocdn\.com/, (route) => route.fulfill({ status: 204, body: "" }));
}

/** Aucun défilement horizontal de la page (règle mobile). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function loginAs(page: Page, role: "client" | "artist") {
  await page.addInitScript((r) => {
    if (localStorage.getItem("fastattoo-v1")) return;
    localStorage.setItem(
      "fastattoo-v1",
      JSON.stringify({ state: { session: { role: r, userId: r === "artist" ? "a001" : "client-me", name: r === "artist" ? "Léa" : "Thomas", email: "" } }, version: 1 }),
    );
  }, role);
}

/** Zones tactiles des éléments interactifs visibles ≥ 44×44 px (tolérance 1px). */
export async function smallTapTargets(page: Page, selector = "main button, main a, nav a") {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && !el.closest("[aria-hidden=true]") && !el.closest("p");
      })
      .map((el) => ({ text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
      .filter((t) => t.w < 43 || t.h < 43);
  }, selector);
}
