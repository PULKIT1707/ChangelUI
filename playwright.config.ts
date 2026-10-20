// Dashboard e2e (design 12.5, plan P10). Chromium only; run `npx playwright install chromium` once.
// The preview server binds to 127.0.0.1 (dashboard/vite.config.ts) and is stopped by Playwright.
import { defineConfig, devices } from "@playwright/test";

// PUI_E2E_PORT lets a second checkout run e2e beside another preview server.
const port = Number(process.env.PUI_E2E_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  testIgnore: "consumer.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run build:dashboard && npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: "desktop", grep: /@desktop/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", grep: /@mobile/, use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
  ],
});
