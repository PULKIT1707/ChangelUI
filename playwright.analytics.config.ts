// Analytics e2e (analytics plan, decision 16): the dashboard built with a FAKE PostHog key and an
// unresolvable `.invalid` host, into dashboard/dist-e2e on its own port, so it never clobbers
// dashboard/dist. Every spec route-mocks the fake host and aborts (and fails on) any posthog.com
// request. The preview server binds to 127.0.0.1 (dashboard/vite.config.ts).
import { defineConfig, devices } from "@playwright/test";

// PUI_E2E_ANALYTICS_PORT lets a second checkout run this suite beside another preview server.
const port = Number(process.env.PUI_E2E_ANALYTICS_PORT ?? 4174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "analytics.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run build:dashboard -- --outDir dist-e2e && npm run preview -- --outDir dist-e2e --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
    // Process env VITE_* values take priority over dashboard/.env*.local, so a real key there is never used.
    env: { VITE_POSTHOG_KEY: "phc_e2e_fake_key_not_real", VITE_POSTHOG_HOST: "https://posthog.e2e.invalid" },
  },
  projects: [
    { name: "desktop", grep: /@desktop/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", grep: /@mobile/, use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
  ],
});
