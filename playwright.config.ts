import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const executablePath = process.env.CHROMIUM_PATH;
// Les tests tournent dans Chromium (moteur de Chrome Android). Les profils
// iPhone reprennent tailles d'écran, densité et tactile, pas le moteur WebKit.
const chromium = (d: (typeof devices)[string]) => ({ ...d, browserName: "chromium" as const, defaultBrowserType: "chromium" as const });

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    { name: "iphone-se", use: chromium({ ...devices["iPhone SE"], viewport: { width: 375, height: 667 } }) },
    { name: "iphone-15", use: chromium({ ...devices["iPhone 15"], viewport: { width: 393, height: 852 } }) },
    { name: "iphone-pro-max", use: chromium({ ...devices["iPhone 15 Pro Max"], viewport: { width: 430, height: 932 } }) },
    { name: "pixel-7", use: chromium(devices["Pixel 7"]) },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
