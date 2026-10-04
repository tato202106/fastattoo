import { chromium } from "@playwright/test";
const url = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on("console", (m) => !/TUNNEL|DevTools|HMR/.test(m.text()) && console.log(`[${m.type()}]`, m.text().slice(0, 400)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 400)));
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
console.log(await page.evaluate(() => {
  const c = document.querySelector(".maplibregl-canvas");
  const r = c?.getBoundingClientRect();
  const ms = [...document.querySelectorAll(".ft-marker")].map((m) => { const b = m.getBoundingClientRect(); return `${Math.round(b.x)},${Math.round(b.y)} ${getComputedStyle(m).transform}`; });
  return JSON.stringify({ canvas: r && [r.width, r.height], container: document.querySelector('[aria-label="Carte des tatoueurs"]')?.getBoundingClientRect().height, ms });
}));
await browser.close();
