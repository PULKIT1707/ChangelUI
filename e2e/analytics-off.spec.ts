// The default e2e build has no PostHog key (playwright.config.ts forces it empty): no banner, the
// posthog chunk is never requested and no PostHog host is contacted (analytics plan, decision 9).
import { expect, test } from "@playwright/test";
import { trackErrors } from "./utils";

test("analytics stays off without a key @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  // Belt and braces: even a regression must never reach a real PostHog host from a test.
  await page.context().route(/posthog/i, (route) => route.abort());

  await page.goto("/#/");
  await expect(page.locator("#content h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("region", { name: "Privacy choices" })).toHaveCount(0);

  const privacy = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Privacy", exact: true });
  await expect(privacy).toHaveAttribute("href", "#/docs/privacy");
  await privacy.click();
  await expect(page.locator("#content h1")).toHaveText("Privacy");
  await expect(page.locator("#privacy-settings").getByRole("status")).toContainText("not enabled in this build");
  await page.waitForLoadState("networkidle");

  expect(requests.filter((url) => /assets\/posthog-.*\.js/.test(url)), "posthog chunk requests").toEqual([]);
  expect(requests.filter((url) => /posthog/i.test(new URL(url).hostname)), "PostHog host requests").toEqual([]);
  expect(errors).toEqual([]);
});
