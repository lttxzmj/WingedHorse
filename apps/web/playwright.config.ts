import { defineConfig, devices } from "@playwright/test";

const productionSwQa = process.env.PRODUCTION_SW_QA === "1";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (productionSwQa ? "http://127.0.0.1:4173" : "http://127.0.0.1:5173");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: productionSwQa
            ? "pnpm --filter @wingedhorse/web exec vite preview --host 127.0.0.1 --port 4173"
            : "pnpm --filter @wingedhorse/web dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      })
});
