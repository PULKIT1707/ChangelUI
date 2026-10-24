// Developer's Pick (#/picks) against the analytics-off build: entry points, featured tiles with live
// minis, filter chips, Surprise me, keyboard focus, reduced motion (axe, overflow) and screenshots.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { THEMES, applyTheme, screenshotPath, trackErrors } from "./utils";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const FEATURED_COUNT = 6;
const ITEM_HREF = /^#\/(text|effects|backgrounds|charts)\/[a-z0-9-]+$/;

const gallery = (page: Page) => page.getByRole("list", { name: "Developer's picks" });
const cards = (page: Page) => gallery(page).getByTestId("pick-card");
const hrefs = (page: Page) => cards(page).evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
const hash = (page: Page) => page.evaluate(() => window.location.hash);
// Lazy page chunks and live minis compete for CPU when the suites run in parallel.
const SLOW = { timeout: 15_000 };

async function openPicks(page: Page, query = ""): Promise<void> {
  await page.goto(`/#/picks${query}`);
  await expect(page.locator("#content h1")).toHaveText("Developer's Pick", SLOW);
}

async function noOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, "horizontal overflow").toBeLessThanOrEqual(overflow.clientWidth);
}

async function featuredLoaded(page: Page): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const card = cards(page).nth(i);
    // On a phone the featured tiles stack, so each one is scrolled near the viewport first.
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("[data-loaded]")).toBeAttached(SLOW);
  }
  await page.evaluate(() => window.scrollTo({ top: 0 }));
}

test("the sidebar opens Developer's Pick and focuses its heading @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  await expect(page.locator("#content h1")).toBeVisible(SLOW);
  // The shell gives a lazy page 5s to show its h1; wait for the idle prefetch so a busy machine
  // (parallel workers) does not turn that into a flake.
  await page.waitForFunction(() => performance.getEntriesByType("resource").some((e) => /\/picks-[\w-]+\.js$/.test(e.name)), undefined, SLOW);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Developer's Pick/ }).click();
  await expect.poll(() => hash(page)).toBe("#/picks");
  const h1 = page.locator("#content h1");
  await expect(h1).toHaveText("Developer's Pick", SLOW);
  await expect(h1).toBeFocused();
  expect(errors).toEqual([]);
});

test("the command palette opens Developer's Pick @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/#/");
  await expect(page.locator("#content h1")).toBeVisible(SLOW);
  await page.keyboard.press("Control+K");
  const input = page.getByRole("combobox", { name: "Search the docs" });
  await expect(input).toBeFocused();
  await input.fill("developer");
  await page.keyboard.press("Enter");
  await expect.poll(() => hash(page)).toBe("#/picks");
  await expect(page.locator("#content h1")).toHaveText("Developer's Pick", SLOW);
  expect(errors).toEqual([]);
});

test("featured picks come first with live minis and every card opens an item @desktop @mobile", async ({ page }) => {
  const errors = trackErrors(page);
  await openPicks(page);
  const featured = await cards(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-featured")));
  expect(featured.slice(0, FEATURED_COUNT)).toEqual(Array(FEATURED_COUNT).fill("true"));
  expect(featured.slice(FEATURED_COUNT).every((value) => value === "false")).toBe(true);
  await featuredLoaded(page);
  const all = await hrefs(page);
  expect(all.length).toBeGreaterThan(FEATURED_COUNT);
  for (const href of all) expect(href).toMatch(ITEM_HREF);

  const first = cards(page).first();
  const title = (await first.locator("h3").textContent()) ?? "";
  await first.click();
  await expect(page.locator("#content h1")).toHaveText(title, SLOW);
  await expect(page.getByTestId("preview-root")).toBeVisible(SLOW);
  expect(errors).toEqual([]);
});

test("filter chips narrow the picks and follow the arrow keys @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await openPicks(page);
  const count = page.getByTestId("picks-count");
  const before = (await count.textContent()) ?? "";
  const backgrounds = page.getByRole("radio", { name: "Backgrounds" });
  await backgrounds.click();
  await expect.poll(() => hash(page)).toBe("#/picks?filter=backgrounds");
  await expect(backgrounds).toHaveAttribute("aria-checked", "true");
  await expect(count).not.toHaveText(before);
  await expect.poll(async () => (await hrefs(page)).every((href) => href.startsWith("#/backgrounds/"))).toBe(true);
  expect(await count.textContent()).toBe(`${await cards(page).count()} picks`);

  await backgrounds.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Charts" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("Surprise me opens one of the picks @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await openPicks(page);
  const all = await hrefs(page);
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect.poll(async () => all.includes(await hash(page))).toBe(true);
  await expect(page.locator("#content h1")).toBeVisible(SLOW);
  await expect(page.locator("#content h1")).not.toHaveText("Developer's Pick", SLOW);
  expect(errors).toEqual([]);
});

test("cards show a focus ring and open with Enter @desktop", async ({ page }) => {
  const errors = trackErrors(page);
  await openPicks(page);
  // The "Animate all" switch is the last stop before the grid.
  await page.getByRole("switch", { name: "Animate all" }).focus();
  await page.keyboard.press("Tab");
  const first = cards(page).first();
  await expect(first).toBeFocused();
  const ring = await first.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThan(0);
  const href = (await first.getAttribute("href")) ?? "";
  await page.keyboard.press("Enter");
  await expect.poll(() => hash(page)).toBe(href);
  await expect(page.getByTestId("preview-root")).toBeVisible(SLOW);
  expect(errors).toEqual([]);
});

for (const theme of THEMES) {
  test(`reduced motion keeps previews still and passes axe (${theme}) @desktop @mobile`, async ({ page }, testInfo) => {
    const errors = trackErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await applyTheme(page, theme);
    await openPicks(page);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("switch", { name: "Animate all" })).not.toBeChecked();

    const marquee = page.locator('[data-testid="pick-card"][data-slug="marquee"]');
    await marquee.scrollIntoViewIfNeeded();
    const copies = marquee.locator("[data-pui-marquee-copy]");
    await expect(copies.first()).toBeAttached();
    const names = await copies.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names)).toEqual(new Set(["none"]));
    await page.evaluate(() => window.scrollTo({ top: 0 }));

    const results = await new AxeBuilder({ page }).include("main").withTags(AXE_TAGS).analyze();
    const blocking = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
    expect(blocking, "serious/critical axe violations").toEqual([]);
    await noOverflow(page);
    expect(errors).toEqual([]);
    await page.screenshot({ path: screenshotPath(testInfo.project.name, theme, "picks-reduced-motion.png"), fullPage: true });
  });

  test(`hero and home teaser screenshots (${theme}) @desktop @mobile`, async ({ page }, testInfo) => {
    const errors = trackErrors(page);
    await applyTheme(page, theme);
    await openPicks(page);
    await featuredLoaded(page);
    await expect(cards(page).first().locator("[data-loaded]")).toBeAttached(SLOW);
    await noOverflow(page);
    await page.screenshot({ path: screenshotPath(testInfo.project.name, theme, "picks-hero.png") });

    await page.goto("/#/");
    const teaser = page.getByRole("region", { name: /Developer's Pick/ });
    await teaser.scrollIntoViewIfNeeded();
    const teaserCards = teaser.getByTestId("pick-card");
    await expect(teaserCards).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await teaserCards.nth(i).scrollIntoViewIfNeeded();
      await expect(teaserCards.nth(i).locator("[data-loaded]")).toBeAttached(SLOW);
    }
    await teaser.scrollIntoViewIfNeeded();
    await expect(teaser.getByRole("link", { name: /Explore all \d+ picks/ })).toHaveAttribute("href", "#/picks");
    await noOverflow(page);
    await teaser.screenshot({ path: screenshotPath(testInfo.project.name, theme, "home-picks-teaser.png") });
    expect(errors).toEqual([]);
  });
}
