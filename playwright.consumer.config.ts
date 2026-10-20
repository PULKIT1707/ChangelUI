// Consumer browser checks (design 12.4, plan P10). No webServer: scripts/consumer-test.ts starts
// `vite preview` for each packed consumer and passes PUI_CONSUMER_A_URL / PUI_CONSUMER_B_URL.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: "consumer.spec.ts",
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/consumer",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});
