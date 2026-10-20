// Every dashboard route in light and dark (design 12.5, AC-22, AC-29): h1, theme class, no errors,
// no overflow at 360px, axe on <main> with the nested-theme island guard, and a full-page screenshot.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ENTRIES } from "../scripts/entries.ts";
import { THEMES, applyTheme, screenshotPath, trackErrors } from "./utils";

interface RouteCase {
  hash: string;
  h1: string;
  /** Home's h1 ends in a WordRotate, so it is matched by prefix (plan P16). */
  partial?: boolean;
  shot: string;
  /** Item pages lazy-load their preview module. */
  item?: boolean;
}

const routes: RouteCase[] = [
  { hash: "#/", h1: "Tiny, accessible React", partial: true, shot: "home" },
  { hash: "#/docs/installation", h1: "Installation", shot: "docs-installation" },
  { hash: "#/docs/theming", h1: "Theming", shot: "docs-theming" },
  { hash: "#/nope/nope", h1: "Page not found", shot: "unknown-route" },
  ...ENTRIES.filter((e) => e.docs).map((e) => ({
    hash: `#/${e.category}/${e.name}`,
    h1: e.title,
    shot: `${e.category}-${e.name}`,
    item: true,
  })),
];

/**
 * Decorative false positives excluded from axe. Empty: no exclusion is needed today. Any selector
 * added here must say why, and the island guard below fails if it touches a nested-theme island.
 */
const AXE_EXCLUDE: string[] = [];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const route of routes) {
  for (const theme of THEMES) {
    test(`${route.hash} (${theme}) @desktop @mobile`, async ({ page }, testInfo) => {
      const errors = trackErrors(page);
      await applyTheme(page, theme);
      await page.goto(`/${route.hash}`);

      const h1 = page.locator("#content h1");
      if (route.partial) await expect(h1).toContainText(route.h1);
      else await expect(h1).toHaveText(route.h1);
      await page.waitForLoadState("networkidle");
      if (route.item) await expect(page.getByTestId("preview-root")).toBeVisible();

      const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      expect(dark).toBe(theme === "dark");

      if (testInfo.project.name === "mobile") {
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(overflow.scrollWidth, "horizontal overflow at 360px").toBeLessThanOrEqual(overflow.clientWidth);
      }

      if (route.hash === "#/docs/theming") {
        await expect(page.getByTestId("island-light")).toHaveCount(1);
        await expect(page.getByTestId("island-dark")).toHaveCount(1);
        // Island guard (design 12.5): no excluded element may contain, equal or sit inside an island.
        const touching = await page.evaluate((selectors) => {
          const islands = [...document.querySelectorAll('[data-testid^="island-"]')];
          const hits: string[] = [];
          for (const selector of selectors) {
            for (const el of document.querySelectorAll(selector)) {
              for (const island of islands) {
                if (el.contains(island) || island.contains(el)) hits.push(`${selector} ~ ${island.getAttribute("data-testid")}`);
              }
            }
          }
          return { islands: islands.length, hits };
        }, AXE_EXCLUDE);
        expect(touching.islands).toBeGreaterThanOrEqual(2);
        expect(touching.hits).toEqual([]);
      }

      // WCAG 2.2 AA adds target-size; best-practice keeps heading-order, region and landmark rules.
      let axe = new AxeBuilder({ page }).include("main").withTags(AXE_TAGS);
      for (const selector of AXE_EXCLUDE) axe = axe.exclude(selector);
      const results = await axe.analyze();
      const format = (v: (typeof results.violations)[number]) =>
        `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`;
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map(format);
      expect(blocking, "serious/critical axe violations").toEqual([]);
      if (route.item) {
        const headings = results.violations.filter((v) => v.id === "heading-order").map(format);
        expect(headings, "heading-order violations").toEqual([]);
      }

      expect(errors).toEqual([]);

      await page.screenshot({
        path: screenshotPath(testInfo.project.name, theme, `${route.shot}.png`),
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}
