// Consent banner and analytics tiers against the fake-key build (playwright.analytics.config.ts,
// plan decision 16). The fake host is route-mocked; any request to a real posthog.com host is
// aborted and fails the test.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";
import { THEMES, applyTheme, decodePostHogEvents, isPostHogIngestion, screenshotPath, trackErrors } from "./utils";

const FAKE_HOST = "https://posthog.e2e.invalid";
const CONSENT_KEY = "pui-analytics-consent";
const POSTHOG_NAME = /^(ph_|__ph)/;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

let realHits: string[] = [];
let captured: Request[] = [];
let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  realHits = [];
  captured = [];
  errors = trackErrors(page);
  // posthog-js silently drops every capture from a "likely bot": automation sets navigator.webdriver
  // and headless Chromium lists a "HeadlessChrome" userAgentData brand. Hide both for this suite only.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
  await page.context().route(/posthog\.com/, (route) => {
    realHits.push(route.request().url());
    return route.abort();
  });
  await page.route(`${FAKE_HOST}/**`, (route) => {
    captured.push(route.request());
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

test.afterEach(() => {
  expect(realHits, "requests to a real posthog.com host").toEqual([]);
  expect(errors, "console errors / page errors").toEqual([]);
});

const bannerOf = (page: Page) => page.getByRole("region", { name: "Privacy choices" });

async function open(page: Page, hash = "#/"): Promise<void> {
  await page.goto(`/${hash}`);
  await expect(page.locator("#content h1")).toBeVisible();
}

/** Every event in the intercepted ingestion requests so far. */
const ingestedEvents = () => captured.filter((r) => isPostHogIngestion(r.url())).flatMap(decodePostHogEvents);

/** Waits until PostHog has flushed at least one ingestion batch to the fake host. */
async function waitForBatch(): Promise<void> {
  await expect.poll(() => captured.filter((r) => isPostHogIngestion(r.url())).length, { timeout: 20_000 }).toBeGreaterThan(0);
}

async function storageNames(page: Page): Promise<{ local: string[]; session: string[]; cookies: string[] }> {
  const names = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookies: document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim() ?? "")
      .filter(Boolean),
  }));
  const contextCookies = (await page.context().cookies()).map((cookie) => cookie.name);
  return { ...names, cookies: [...new Set([...names.cookies, ...contextCookies])] };
}

async function posthogNames(page: Page): Promise<string[]> {
  const { local, session, cookies } = await storageNames(page);
  return [...local, ...session, ...cookies].filter((name) => POSTHOG_NAME.test(name));
}

const storedChoice = (page: Page) =>
  page.evaluate((key) => (JSON.parse(localStorage.getItem(key) ?? "null") as { choice?: string } | null)?.choice ?? null, CONSENT_KEY);

async function outlineOf(locator: Locator): Promise<{ style: string; width: number }> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test("banner shows on a first visit with equal choices and a privacy link @desktop", async ({ page }) => {
  await open(page);
  const banner = bannerOf(page);
  await expect(banner).toBeVisible();
  const accept = banner.getByRole("button", { name: "Accept" });
  const decline = banner.getByRole("button", { name: "Decline" });
  const a = await accept.boundingBox();
  const d = await decline.boundingBox();
  expect(a && d).toBeTruthy();
  if (!a || !d) return;
  expect(Math.abs(a.width - d.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.height - d.height)).toBeLessThanOrEqual(1);
  await expect(banner.getByRole("link", { name: "Privacy details" })).toHaveAttribute("href", "#/docs/privacy");
  // Pending is the anonymous tier: nothing PostHog-named is stored yet.
  await waitForBatch();
  expect(await posthogNames(page)).toEqual([]);
});

test("decline keeps only the consent key and sends cookieless events @desktop", async ({ page }) => {
  await open(page);
  await bannerOf(page).getByRole("button", { name: "Decline" }).click();
  await expect(bannerOf(page)).toHaveCount(0);
  expect(await storedChoice(page)).toBe("declined");

  await expect.poll(() => ingestedEvents().some((e) => e.event === "consent_changed"), { timeout: 20_000 }).toBe(true);
  const consent = ingestedEvents().find((e) => e.event === "consent_changed");
  expect(consent?.properties).toMatchObject({ choice: "declined", source: "banner" });
  for (const { event } of ingestedEvents()) expect(event).not.toMatch(/^\$(autocapture|snapshot|rageclick|dead_click|heatmap)/);

  const { local, session } = await storageNames(page);
  expect(local).toContain(CONSENT_KEY);
  expect(local.filter((name) => !name.startsWith("pui-"))).toEqual([]);
  expect(session.filter((name) => POSTHOG_NAME.test(name))).toEqual([]);
  expect(await posthogNames(page)).toEqual([]);
});

test("accept persists across reload and the banner stays hidden @desktop", async ({ page }) => {
  await open(page);
  await bannerOf(page).getByRole("button", { name: "Accept" }).click();
  await expect(bannerOf(page)).toHaveCount(0);
  expect(await storedChoice(page)).toBe("accepted");
  await page.reload();
  await expect(page.locator("#content h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(bannerOf(page)).toHaveCount(0);
  expect(await storedChoice(page)).toBe("accepted");
});

test("privacy settings show the choice and withdraw clears PostHog storage @desktop", async ({ page }) => {
  await open(page);
  await bannerOf(page).getByRole("button", { name: "Accept" }).click();
  await expect(bannerOf(page)).toHaveCount(0);
  // The full tier opts PostHog in, which persists its keys.
  await expect.poll(() => posthogNames(page), { timeout: 20_000 }).not.toEqual([]);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.locator("#content h1")).toHaveText("Privacy");
  const settings = page.locator("#privacy-settings");
  await expect(settings.getByRole("status")).toHaveText("Status: Allowed");
  await settings.getByRole("button", { name: "Withdraw consent" }).click();
  await expect(settings.getByRole("status")).toHaveText("Status: Declined");
  await expect.poll(() => posthogNames(page)).toEqual([]);
  expect(await storedChoice(page)).toBe("declined");
  // The same button turns back into Accept, so keyboard focus is not lost.
  await expect(settings.getByRole("button", { name: "Accept full analytics" })).toBeFocused();
});

test("keyboard reaches the banner after the skip link and a choice moves focus to the content @desktop", async ({ page }) => {
  await open(page);
  const banner = bannerOf(page);
  await expect(banner).toBeVisible();
  const order = [
    page.getByRole("link", { name: "Skip to content" }),
    banner.getByRole("link", { name: "Privacy details" }),
    banner.getByRole("button", { name: "Accept" }),
    banner.getByRole("button", { name: "Decline" }),
  ];
  for (const target of order) {
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    if (target !== order[0]) {
      const ring = await outlineOf(target);
      expect(ring.style).not.toBe("none");
      expect(ring.width).toBeGreaterThan(0);
    }
  }
  await page.keyboard.press("Enter");
  await expect(banner).toHaveCount(0);
  await expect(page.locator("#content")).toBeFocused();
  expect(await storedChoice(page)).toBe("declined");
});

test("palette events reach the ingestion batch without free text @desktop", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Control+K");
  const input = page.getByRole("combobox", { name: "Search the docs" });
  await expect(input).toBeFocused();
  await input.fill("qqzzxxnonsense");
  await expect(page.getByTestId("command-palette").getByRole("status")).toContainText("No results");

  await expect.poll(() => ingestedEvents().some((e) => e.event === "palette_opened"), { timeout: 20_000 }).toBe(true);
  await expect.poll(() => ingestedEvents().some((e) => e.event === "palette_search"), { timeout: 20_000 }).toBe(true);
  const search = ingestedEvents().find((e) => e.event === "palette_search");
  // Zero results is the one case that carries the (truncated) query text (decision D1).
  expect(search?.properties).toMatchObject({ query_length: 14, result_count: 0, query: "qqzzxxnonsense" });
  const pageview = ingestedEvents().find((e) => e.event === "$pageview");
  expect(pageview?.properties).toMatchObject({ route_kind: "home", route_key: "home", category: null, component: null });
});

test("Global Privacy Control hides the banner and sends nothing @desktop", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }));
  await open(page);
  await page.waitForLoadState("networkidle");
  // Longer than PostHog's batch interval, so a queued flush would have happened.
  await page.waitForTimeout(4000);
  await expect(bannerOf(page)).toHaveCount(0);
  expect(captured.map((r) => r.url())).toEqual([]);
  expect(requests.filter((url) => /assets\/posthog-.*\.js/.test(url))).toEqual([]);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.locator("#privacy-settings").getByRole("status")).toHaveText("Status: Browser privacy signal detected");
});

test("Do Not Track sends nothing until an explicit opt-in from the privacy settings @desktop", async ({ page }) => {
  const chunks: string[] = [];
  page.on("request", (request) => {
    if (/assets\/posthog-.*\.js/.test(request.url())) chunks.push(request.url());
  });
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "doNotTrack", { get: () => "1" }));
  await open(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(4000);
  await expect(bannerOf(page)).toHaveCount(0);
  expect(captured.map((r) => r.url())).toEqual([]);
  expect(chunks).toEqual([]);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Privacy", exact: true }).click();
  const settings = page.locator("#privacy-settings");
  await expect(settings.getByRole("status")).toHaveText("Status: Browser privacy signal detected");
  await settings.getByRole("button", { name: "Accept full analytics" }).click();
  await expect(settings.getByRole("status")).toHaveText("Status: Allowed");
  expect(await storedChoice(page)).toBe("accepted");
  // The opt-in loads the SDK and sends the choice made in the settings.
  await expect.poll(() => chunks.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await expect.poll(() => ingestedEvents().some((e) => e.event === "consent_changed"), { timeout: 20_000 }).toBe(true);
  expect(ingestedEvents().find((e) => e.event === "consent_changed")?.properties).toMatchObject({ choice: "accepted", source: "settings" });
});

test("URLs in every sent event keep only the route and allowlisted hash params @desktop", async ({ page }) => {
  await page.goto("/?leak=SECRETQUERY#/components/button?tab=code&leak=SECRETHASH");
  await expect(page.locator("#content h1")).toBeVisible();
  await expect.poll(() => ingestedEvents().some((e) => e.event === "$pageview"), { timeout: 20_000 }).toBe(true);
  // posthog-js nests copies of the page URL in each $web_vitals metric; flushed within its 5 s window.
  await expect.poll(() => ingestedEvents().some((e) => e.event === "$web_vitals"), { timeout: 20_000 }).toBe(true);
  const pageview = ingestedEvents().find((e) => e.event === "$pageview");
  expect(pageview?.properties).toMatchObject({ $current_url: expect.stringMatching(/\/#\/components\/button\?tab=code$/) });
  const vitals = ingestedEvents().find((e) => e.event === "$web_vitals");
  const nested = Object.entries(vitals?.properties ?? {}).filter(([key]) => /^\$web_vitals_[A-Z]+_event$/.test(key));
  expect(nested.length).toBeGreaterThan(0);
  for (const [key, metric] of nested) {
    expect(metric, key).toMatchObject({ $current_url: expect.stringMatching(/\/#\/components\/button\?tab=code$/) });
  }
  const sent = JSON.stringify(ingestedEvents());
  expect(sent).not.toContain("leak");
  expect(sent).not.toContain("SECRET");
});

test("Developer's Pick events reach the batch without free text @desktop", async ({ page }) => {
  await open(page, "#/picks");
  await expect(page.locator("#content h1")).toHaveText("Developer's Pick");
  await bannerOf(page).getByRole("button", { name: "Decline" }).click();
  await expect(bannerOf(page)).toHaveCount(0);

  await expect.poll(() => ingestedEvents().some((e) => e.event === "$pageview"), { timeout: 20_000 }).toBe(true);
  const pageview = ingestedEvents().find((e) => e.event === "$pageview");
  expect(pageview?.properties).toMatchObject({ route_kind: "picks", route_key: "picks", category: "picks", component: null });

  await page.getByRole("radio", { name: "Text" }).click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#/picks?filter=text");
  await page.getByTestId("pick-card").first().click();
  await expect(page.getByTestId("preview-root")).toBeVisible({ timeout: 15_000 });
  await page.goBack();
  await expect(page.locator("#content h1")).toHaveText("Developer's Pick", { timeout: 15_000 });
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.getByTestId("preview-root")).toBeVisible({ timeout: 15_000 });

  const expected: Record<string, string[]> = {
    devs_pick_filter_changed: ["category"],
    devs_pick_card_clicked: ["category", "component", "featured", "position", "surface"],
    devs_pick_surprise_clicked: ["category", "component", "filter"],
  };
  for (const name of Object.keys(expected)) {
    await expect.poll(() => ingestedEvents().some((e) => e.event === name), { timeout: 20_000 }).toBe(true);
  }
  // PostHog's own `$` properties, the token and id, and the two facts the sanitizer adds to every event.
  const SDK_KEYS = new Set(["token", "distinct_id", "viewport_bucket", "color_scheme"]);
  const SLUG = /^[a-z0-9-]+$/;
  for (const [name, keys] of Object.entries(expected)) {
    const event = ingestedEvents().find((e) => e.event === name);
    const custom = Object.keys(event?.properties ?? {}).filter((key) => !key.startsWith("$") && !SDK_KEYS.has(key));
    expect(custom.sort(), name).toEqual(keys);
  }
  const filter = ingestedEvents().find((e) => e.event === "devs_pick_filter_changed")?.properties;
  expect(filter).toMatchObject({ category: "text" });
  const click = ingestedEvents().find((e) => e.event === "devs_pick_card_clicked")?.properties ?? {};
  expect(click).toMatchObject({ category: "text", position: 0, surface: "picks" });
  expect(click.component).toMatch(SLUG);
  expect(typeof click.featured).toBe("boolean");
  const surprise = ingestedEvents().find((e) => e.event === "devs_pick_surprise_clicked")?.properties ?? {};
  expect(surprise).toMatchObject({ category: "text", filter: "text" });
  expect(surprise.component).toMatch(SLUG);
});

test("an outdated consent version shows the banner again @desktop", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ v: 0, choice: "accepted", date: "2025-01-01" }));
  }, CONSENT_KEY);
  await open(page);
  await expect(bannerOf(page)).toBeVisible();
});

for (const theme of THEMES) {
  test(`banner is axe-clean (${theme}) @desktop`, async ({ page }) => {
    await applyTheme(page, theme);
    await open(page);
    await expect(bannerOf(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[aria-label="Privacy choices"]').withTags(AXE_TAGS).analyze();
    expect(results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });

  test(`banner layout and screenshot (${theme}) @desktop @mobile`, async ({ page }, testInfo) => {
    await applyTheme(page, theme);
    await open(page);
    const banner = bannerOf(page);
    await expect(banner).toBeVisible();
    await page.waitForLoadState("networkidle");

    const box = await banner.boundingBox();
    const h1 = await page.locator("#content h1").boundingBox();
    const header = await page.locator("header").first().boundingBox();
    const viewport = page.viewportSize();
    expect(box && h1 && header && viewport).toBeTruthy();
    if (!box || !h1 || !header || !viewport) return;
    expect(intersects(box, h1), "banner covers the page h1").toBe(false);
    expect(intersects(box, header), "banner covers the top bar").toBe(false);
    if (testInfo.project.name === "mobile") {
      expect(box.height).toBeLessThan(viewport.height * 0.45);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "horizontal overflow at 360px").toBeLessThanOrEqual(0);
    }
    // The page reserves room for the banner, so the end of every page stays reachable.
    const offset = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--pui-consent-offset"));
    expect(parseFloat(offset)).toBeGreaterThanOrEqual(box.height);

    await page.screenshot({
      path: screenshotPath("analytics", `banner-${theme}-${testInfo.project.name}.png`),
      animations: "disabled",
    });
  });
}
