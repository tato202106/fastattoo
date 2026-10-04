// Captures d'écran des écrans clés aux tailles mobiles de référence.
//   node scripts/screenshots.mjs [baseUrl] [--only=home,explorer] [--sizes=375,430]
// Variables : CHROMIUM_PATH (navigateur), FAKE_TILES=1 (tuiles de carte simulées
// quand le réseau vers le fournisseur de tuiles est bloqué).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000";
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const sizes = (args.find((a) => a.startsWith("--sizes="))?.slice(8) ?? "375,430").split(",").map(Number);
const out = "screenshots";
mkdirSync(out, { recursive: true });

const DEVICES = {
  375: { width: 375, height: 667, label: "iphone-se" },
  393: { width: 393, height: 852, label: "iphone-15" },
  412: { width: 412, height: 915, label: "pixel-7" },
  430: { width: 430, height: 932, label: "iphone-pro-max" },
  1280: { width: 1280, height: 800, label: "desktop" },
};

/** Tuile simulée : fond clair + « rues » pseudo-aléatoires (uniquement pour les captures hors réseau). */
async function fakeTile(z, x, y) {
  let seed = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const lines = [];
  for (let i = 0; i < 7; i++) {
    const w = 3 + rnd() * 9;
    if (rnd() > 0.5) lines.push(`<line x1="0" y1="${rnd() * 512}" x2="512" y2="${rnd() * 512}" stroke="#fff" stroke-width="${w}"/>`);
    else lines.push(`<line x1="${rnd() * 512}" y1="0" x2="${rnd() * 512}" y2="512" stroke="#fff" stroke-width="${w}"/>`);
  }
  const park = rnd() > 0.6 ? `<rect x="${rnd() * 380}" y="${rnd() * 380}" width="${80 + rnd() * 90}" height="${60 + rnd() * 90}" rx="12" fill="#dfe8d5"/>` : "";
  const water = rnd() > 0.85 ? `<path d="M0 ${300 + rnd() * 100} C 150 ${250 + rnd() * 80}, 350 ${380 + rnd() * 60}, 512 ${320 + rnd() * 80} L512 512 L0 512Z" fill="#d4e2ec"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#eeebe5"/>${park}${water}${lines.join("")}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const SCREENS = [
  { name: "home", path: "/" },
  { name: "explorer", path: "/explorer?q=Nantes", wait: 2500 },
  { name: "explorer-list", path: "/explorer?q=Nantes", wait: 2500, action: async (p) => { await p.getByRole("button", { name: "Agrandir la liste" }).click(); await p.getByRole("button", { name: "Agrandir la liste" }).click(); await p.waitForTimeout(700); } },
  { name: "filters", path: "/explorer?q=Nantes", wait: 1500, action: async (p) => { await p.getByRole("button", { name: /Filtrer/ }).first().click(); await p.waitForTimeout(900); } },
  { name: "search", path: "/", action: async (p) => { await p.getByRole("button", { name: /Rechercher/ }).first().click(); await p.waitForTimeout(400); await p.keyboard.type("fine line nan", { delay: 30 }); await p.waitForTimeout(900); } },
  { name: "profile", path: "/tatoueurs/lea-ink", wait: 1500 },
  { name: "profile-portfolio", path: "/tatoueurs/lea-ink", wait: 1500, action: async (p) => { await p.evaluate(() => window.scrollTo(0, 620)); await p.waitForTimeout(1200); } },
  { name: "lightbox", path: "/tatoueurs/lea-ink", wait: 1500, action: async (p) => { await p.getByRole("button", { name: /Agrandir/ }).first().click(); await p.waitForTimeout(1500); } },
  { name: "request", path: "/tatoueurs/lea-ink/demande", wait: 800 },
];

const executablePath = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

for (const size of sizes) {
  const d = DEVICES[size];
  const context = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 2,
    isMobile: size < 1000,
    hasTouch: size < 1000,
    locale: "fr-FR",
    geolocation: { latitude: 47.2184, longitude: -1.5536 },
    permissions: ["geolocation"],
    colorScheme: process.env.DARK ? "dark" : "light",
  });
  if (process.env.FAKE_TILES) {
    await context.route(/basemaps\.cartocdn\.com\/.*\/(\d+)\/(\d+)\/(\d+)/, async (route) => {
      const m = route.request().url().match(/\/(\d+)\/(\d+)\/(\d+)(@2x)?\.png/);
      await route.fulfill({ contentType: "image/png", body: await fakeTile(Number(m[1]), Number(m[2]), Number(m[3])) });
    });
  }
  if (process.env.SESSION) {
    await context.addInitScript((role) => {
      const raw = localStorage.getItem("fastattoo-v1");
      if (!raw) localStorage.setItem("fastattoo-v1", JSON.stringify({ state: { session: { role, userId: role === "artist" ? "a001" : "client-me", name: role === "artist" ? "Léa" : "Thomas", email: "demo@fastattoo.fr" } }, version: 1 }));
    }, process.env.SESSION);
  }
  for (const s of process.env.SCREENS ? JSON.parse(process.env.SCREENS) : SCREENS) {
    if (only && !only.includes(s.name)) continue;
    const page = await context.newPage();
    await page.goto(base + s.path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(s.wait ?? 700);
    if (s.action) await s.action(page).catch((e) => console.warn(`  ⚠ ${s.name}: ${e.message.split("\n")[0]}`));
    else if (s.actionSrc) await new Function("p", `return (async () => { ${s.actionSrc} })()`)(page).catch((e) => console.warn(`  ⚠ ${s.name}: ${e.message.split("\n")[0]}`));
    const file = `${out}/${s.name}-${d.label}-${d.width}.png`;
    await page.screenshot({ path: file });
    console.log("✓", file);
    await page.close();
  }
  await context.close();
}
await browser.close();
