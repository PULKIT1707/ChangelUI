// Dashboard interaction checks (design 12.5, AC-9, AC-17, AC-23 to AC-28).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { THEMES, applyTheme, screenshotPath, trackErrors, type Theme } from "./utils";

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = trackErrors(page);
});
test.afterEach(() => {
  expect(errors, "console errors / page errors").toEqual([]);
});

async function openPage(page: Page, hash: string, theme: Theme = "light"): Promise<void> {
  await applyTheme(page, theme);
  await page.goto(`/${hash}`);
  await expect(page.locator("#content h1")).toBeVisible();
}

async function outlineOf(locator: Locator): Promise<{ style: string; width: number }> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
}

test.describe("palette", () => {
  test("Cmd/Ctrl+K, search, Enter navigates, Escape returns focus @desktop", async ({ page }) => {
    await openPage(page, "#/");
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();
    const input = page.getByRole("combobox", { name: "Search the docs" });
    await expect(input).toBeFocused();
    await input.fill("butt");
    const active = page.locator('[role="option"][data-active]');
    await expect(active.locator("span").first()).toHaveText("Button");
    await expect(input).toHaveAttribute("aria-activedescendant", (await active.getAttribute("id")) ?? "");
    await page.screenshot({ path: screenshotPath("desktop", "palette-open.png"), animations: "disabled" });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#\/components\/button$/);
    await expect(palette).toHaveCount(0);
    await expect(page.locator("#content h1")).toHaveText("Button");

    const search = page.getByRole("button", { name: /search/i });
    await search.focus();
    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(search).toBeFocused();
  });
});

test("theme toggle persists across reload @desktop", async ({ page }) => {
  // No addInitScript here: it would re-store "light" on reload. A fresh context starts light.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#/docs/theming");
  const toggle = page.getByRole("button", { name: "Dark mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  expect(await page.evaluate(() => localStorage.getItem("pui-theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(page.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
});

test("sidebar marks the active link with aria-current @desktop", async ({ page }) => {
  await openPage(page, "#/components/button");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Button", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await nav.getByRole("link", { name: "Theming", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Theming", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Button", exact: true })).not.toHaveAttribute("aria-current", "page");
});

test("mobile drawer opens, closes on Escape and returns focus @mobile", async ({ page }) => {
  await openPage(page, "#/");
  const hamburger = page.getByRole("button", { name: "Open navigation" });
  await hamburger.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(hamburger).toHaveAttribute("aria-expanded", "true");
  // Let the slide-in settle before the screenshot.
  await page.waitForTimeout(600);
  await page.screenshot({ path: screenshotPath("mobile", "drawer-open.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(hamburger).toBeFocused();
});

test.describe("item page", () => {
  test("Preview/Code switch with arrow keys and ?tab=code deep-links @desktop", async ({ page }) => {
    await openPage(page, "#/components/button");
    const preview = page.getByRole("tab", { name: "Preview" });
    const code = page.getByRole("tab", { name: "Code" });
    await preview.focus();
    await page.keyboard.press("ArrowRight");
    await expect(code).toHaveAttribute("aria-selected", "true");
    await expect(code).toBeFocused();
    await expect(page).toHaveURL(/tab=code/);
    await expect(page.getByTestId("source-code")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(preview).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("preview-stage")).toBeVisible();

    await page.goto("/#/components/button?tab=code");
    await expect(page.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("source-code")).toBeVisible();
  });

  test("copy source puts the exact ?raw text on the clipboard @desktop", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openPage(page, "#/components/button?tab=code");
    const copy = page.getByTestId("copy-source").first();
    await expect(copy).toHaveAccessibleName("Copy src/components/button.tsx");
    await copy.click();
    // The dashboard imports sources with ?raw, which is the file content byte for byte.
    const raw = readFileSync(fileURLToPath(new URL("../src/components/button.tsx", import.meta.url)), "utf8");
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(raw);
    expect(await page.getByTestId("source-code").textContent()).toBe(raw);
  });

  test("NumberTicker replay resets and reaches the value again @desktop", async ({ page }) => {
    await openPage(page, "#/text/number-ticker");
    const root = page.getByTestId("preview-root");
    const ticker = () => root.locator('[aria-hidden="true"]').first();
    await expect(ticker()).toHaveText("12,840", { timeout: 10_000 });
    await root.evaluate((el) => {
      const seen: string[] = [];
      (window as unknown as { __tickerValues: string[] }).__tickerValues = seen;
      new MutationObserver(() => {
        const text = el.querySelector('[aria-hidden="true"]')?.textContent;
        if (text) seen.push(text);
      }).observe(el, { subtree: true, childList: true, characterData: true });
    });
    await page.getByRole("button", { name: "Replay animation" }).click();
    await expect(ticker()).toHaveText("12,840", { timeout: 10_000 });
    const seen = await page.evaluate(() => (window as unknown as { __tickerValues: string[] }).__tickerValues);
    const numbers = seen.map((s) => Number(s.replace(/,/g, "")));
    expect(Math.min(...numbers)).toBeLessThan(12840);
  });

  test("Button variant control updates the snippet and the preview @desktop", async ({ page }) => {
    await openPage(page, "#/components/button");
    const button = page.getByTestId("preview-stage").getByRole("button", { name: /Get started/ });
    await expect(button).toHaveAttribute("data-variant", "solid");
    await page.getByTestId("controls-panel").getByLabel("Variant").selectOption("outline");
    await expect(page.getByTestId("snippet")).toContainText('variant="outline"');
    await expect(button).toHaveAttribute("data-variant", "outline");
  });
});

test("the first Tab focuses Skip to content @desktop", async ({ page }) => {
  await openPage(page, "#/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
});

for (const theme of THEMES) {
  test(`keyboard focus ring on the preview Button (${theme}) @desktop`, async ({ page }) => {
    await openPage(page, "#/components/button", theme);
    const button = page.getByTestId("preview-stage").getByRole("button", { name: /Get started/ });
    await expect(button).toBeVisible();
    // The sidebar lists every item, so the number of Tab stops grows with the catalog.
    const stops = await page.evaluate(
      () => document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]").length,
    );
    let focused = false;
    for (let i = 0; i < stops + 10 && !focused; i += 1) {
      await page.keyboard.press("Tab");
      focused = await button.evaluate((el) => el === document.activeElement);
    }
    expect(focused, "Tab reaches the preview Button").toBe(true);
    const ring = await outlineOf(button);
    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);
  });
}

interface Probed {
  island: { background: string; color: string };
  backdrop: string;
  surface: { background: string; color: string };
  card: { background: string; color: string };
  glow: string;
}

/** Appends a surface and a backdrop probe inside the island and reads the computed values (design 12.5). */
async function probeIsland(page: Page, id: string): Promise<Probed> {
  const island = page.getByTestId(id);
  const card = island.getByTestId("island-card");
  const glow = island.getByTestId("island-glow");
  await expect(card).toHaveCount(1);
  await expect(glow).toHaveCount(1);
  const probes = await island.evaluate((el) => {
    const surface = document.createElement("span");
    surface.setAttribute("style", "color: var(--pui-foreground); background-color: var(--pui-surface)");
    const backdrop = document.createElement("span");
    backdrop.setAttribute("style", "background-color: var(--pui-background)");
    el.append(surface, backdrop);
    const s = getComputedStyle(surface);
    const b = getComputedStyle(backdrop);
    const i = getComputedStyle(el);
    const result = {
      island: { background: i.backgroundColor, color: i.color },
      backdrop: b.backgroundColor,
      surface: { background: s.backgroundColor, color: s.color },
    };
    surface.remove();
    backdrop.remove();
    return result;
  });
  const colors = (locator: Locator) =>
    locator.evaluate((el) => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  return {
    ...probes,
    card: await colors(card),
    glow: await glow.evaluate((el) => getComputedStyle(el).boxShadow),
  };
}

const pageColors = (page: Page, id: string) =>
  page.getByTestId(id).evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    shadow: getComputedStyle(el).boxShadow,
  }));

for (const theme of THEMES) {
  test(`nested themes render their own tokens (page ${theme}) @desktop`, async ({ page }) => {
    await openPage(page, "#/docs/theming", theme);
    const pageCard = await pageColors(page, "page-card");
    const pageGlow = await pageColors(page, "page-glow");
    for (const [id, islandTheme] of [
      ["island-light", "light"],
      ["island-dark", "dark"],
    ] as const) {
      const probed = await probeIsland(page, id);
      expect(probed.island.background, `${id} paints its own background`).toBe(probed.backdrop);
      expect(probed.island.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(probed.island.color, `${id} text color`).toBe(probed.surface.color);
      expect(probed.card.color, `${id} card color`).toBe(probed.surface.color);
      expect(probed.card.background, `${id} card surface`).toBe(probed.surface.background);
      if (islandTheme !== theme) {
        expect(probed.glow, `${id} glow differs from the page glow`).not.toBe(pageGlow.shadow);
        expect(probed.card.color, `${id} card differs from the page card`).not.toBe(pageCard.color);
      }
    }
  });

  test(`scoped override keeps the theme and re-derives the glow (page ${theme}) @desktop`, async ({ page }) => {
    await openPage(page, "#/docs/theming", theme);
    const pageCard = await pageColors(page, "page-card");
    const pageGlow = await pageColors(page, "page-glow");
    const scopeCard = await pageColors(page, "scope-card");
    const scopeGlow = await pageColors(page, "scope-glow");
    expect(scopeCard.color).toBe(pageCard.color);
    expect(scopeCard.background).toBe(pageCard.background);
    expect(scopeGlow.shadow).not.toBe(pageGlow.shadow);
  });
}

test("Tooltip near the viewport top flips to the bottom @desktop", async ({ page }) => {
  await openPage(page, "#/components/tooltip");
  const trigger = page.getByTestId("preview-stage").getByRole("button", { name: "Hover or focus me" });
  await expect(trigger).toBeVisible();
  // Enter the keyboard modality (so the focus below is :focus-visible), put the trigger 8px below
  // the viewport top, then focus it without scrolling.
  await page.keyboard.press("Tab");
  // Control: with room above, the tooltip keeps its preferred top side.
  await trigger.evaluate((el) => el.focus());
  await expect(page.getByRole("tooltip")).toHaveAttribute("data-side", "top");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await trigger.evaluate((el) => el.blur());
  await trigger.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 8));
  await trigger.evaluate((el) => el.focus({ preventScroll: true }));
  const top = await trigger.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(16);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveAttribute("data-side", "bottom");
});

test("an empty Toaster does not block clicks in its corner @desktop @mobile", async ({ page }) => {
  await openPage(page, "#/components/button");
  const list = page.getByRole("region", { name: /^Notifications/ }).locator("ol");
  await expect(list).toBeAttached();
  await expect(list.locator("li")).toHaveCount(0);
  const hit = await list.evaluate((ol) => {
    const rect = ol.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { height: rect.height, insideToaster: el !== null && ol.closest("section")?.contains(el) === true };
  });
  // The list keeps its padding box, so the point really is inside its rect.
  expect(hit.height).toBeGreaterThan(0);
  expect(hit.insideToaster).toBe(false);
});

test("toast deck stacks, expands on hover and resolves a promise @desktop", async ({ page }) => {
  await openPage(page, "#/components/toast");
  const stage = page.getByTestId("preview-stage");
  const list = page.getByRole("region", { name: /^Notifications/ }).locator("ol");
  await expect(list).toHaveAttribute("data-layout", "stack");
  await stage.getByRole("button", { name: "Stack 3" }).click();
  const toasts = list.locator("li");
  await expect(toasts).toHaveCount(3);
  // Let the springs settle before measuring.
  await page.waitForTimeout(900);
  const boxes = async () =>
    toasts.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
    );
  const overlaps = (b: { top: number; bottom: number }[]) =>
    b.some((x, i) => b.some((y, j) => i < j && x.top < y.bottom && y.top < x.bottom));
  expect(overlaps(await boxes()), "collapsed toasts overlap as a deck").toBe(true);
  await list.locator("li[data-front]").hover();
  await expect(list).toHaveAttribute("data-expanded", "");
  await page.waitForTimeout(900);
  expect(overlaps(await boxes()), "expanded toasts no longer overlap").toBe(false);
  await page.mouse.move(10, 10);
  await expect(list).not.toHaveAttribute("data-expanded", "");
  // The three toasts time out (5 s) so the promise toast gets a visible slot.
  await expect(toasts).toHaveCount(0, { timeout: 10_000 });

  await stage.getByRole("button", { name: "Promise" }).click();
  await expect(list.getByText("Uploading…")).toBeVisible();
  await expect(list.getByText("Uploaded")).toBeVisible({ timeout: 5000 });
});

// Drawer swipe zones (review finding 2): swipes start only from the handle, the inner-edge strip or
// the panel's blank padding; content keeps native scrolling and text selection.
type DrawerSide = "top" | "right" | "bottom" | "left";

async function openDrawer(page: Page, side: DrawerSide): Promise<Locator> {
  await openPage(page, "#/components/drawer");
  await page.getByTestId("controls-panel").getByRole("radio", { name: side, exact: true }).click();
  await page.getByTestId("preview-stage").getByRole("button", { name: "Open settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  // Wait for the slide-in to settle (Motion writes transform: none at rest).
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  return dialog;
}

const SWIPE: Record<DrawerSide, { zone: string; dx: number; dy: number }> = {
  top: { zone: "[data-pui-drawer-handle]", dx: 0, dy: -300 },
  bottom: { zone: "[data-pui-drawer-handle]", dx: 0, dy: 300 },
  left: { zone: "[data-pui-drawer-edge]", dx: -300, dy: 0 },
  right: { zone: "[data-pui-drawer-edge]", dx: 300, dy: 0 },
};

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Appends a tall block so the panel overflows (test-only DOM, removed with the panel). */
async function makeOverflow(dialog: Locator): Promise<void> {
  await dialog.evaluate((el) => {
    const filler = document.createElement("div");
    filler.style.height = "1500px";
    filler.style.flexShrink = "0";
    // Right after the header, so the description stays in view at scrollTop 0.
    const description = [...el.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Swipe the grab handle"));
    description?.parentElement?.after(filler);
  });
}

test.describe("drawer swipe zones", () => {
  for (const side of ["top", "right", "bottom", "left"] as const) {
    test(`a mouse swipe from the ${side} drawer's zone dismisses it @desktop`, async ({ page }) => {
      const dialog = await openDrawer(page, side);
      const { zone, dx, dy } = SWIPE[side];
      const start = await centerOf(dialog.locator(zone));
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + dx, start.y + dy, { steps: 12 });
      await page.mouse.up();
      await expect(dialog).toHaveCount(0);
    });
  }

  for (const side of ["right", "left"] as const) {
    test(`the ${side} drawer's edge strip covers only the panel padding @desktop`, async ({ page }) => {
      const dialog = await openDrawer(page, side);
      const result = await dialog.evaluate((panel, s) => {
        const strip = panel.querySelector<HTMLElement>("[data-pui-drawer-edge]");
        if (!strip) return null;
        const rect = strip.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const padding = parseFloat(getComputedStyle(panel)[s === "right" ? "paddingLeft" : "paddingRight"]);
        // One pixel past the strip, toward the content, at the description's height.
        const desc = panel.querySelector("p")?.getBoundingClientRect();
        const y = desc ? desc.top + 8 : panelRect.top + 100;
        const x = s === "right" ? rect.right + 1 : rect.left - 1;
        const next = document.elementFromPoint(x, y);
        const style = getComputedStyle(strip);
        return {
          width: rect.width,
          padding,
          flush: s === "right" ? rect.left - panelRect.left : panelRect.right - rect.right,
          nextIsStrip: next === strip,
          touchAction: style.touchAction,
          background: style.backgroundColor,
          border: parseFloat(style.borderTopWidth) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth) + parseFloat(style.borderBottomWidth),
          shadow: style.boxShadow,
          focusable: strip.tabIndex >= 0,
        };
      }, side);
      expect(result).not.toBeNull();
      expect(result?.width).toBe(result?.padding);
      expect(Math.abs(result?.flush ?? 99)).toBeLessThanOrEqual(1);
      expect(result?.nextIsStrip).toBe(false);
      expect(result?.touchAction).toBe("pan-y");
      expect(result?.background).toBe("rgba(0, 0, 0, 0)");
      expect(result?.border).toBe(0);
      expect(result?.shadow).toBe("none");
      expect(result?.focusable).toBe(false);
      // The close button, painted above the strip, still takes clicks.
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
    });
  }

  test("selecting text inside a drawer works and does not dismiss it @desktop", async ({ page }) => {
    const dialog = await openDrawer(page, "right");
    const panelStyle = await dialog.evaluate((el) => {
      const style = getComputedStyle(el);
      return { userSelect: style.userSelect, touchAction: style.touchAction };
    });
    expect(panelStyle.userSelect).not.toBe("none");
    expect(panelStyle.touchAction).toBe("auto");
    const text = dialog.getByText(/Swipe the grab handle/);
    const box = await text.boundingBox();
    if (!box) throw new Error("description has no box");
    // Along the first line of text (the description wraps; mid-height can fall between lines).
    await page.mouse.move(box.x + 2, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(box.width - 2, 200), box.y + 8, { steps: 8 });
    await page.mouse.up();
    expect((await page.evaluate(() => window.getSelection()?.toString() ?? "")).length).toBeGreaterThan(5);
    await page.waitForTimeout(400);
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  });
});

test.describe("drawer touch", () => {
  test.use({ hasTouch: true });

  for (const side of ["top", "bottom"] as const) {
    test(`touch scrolling inside a ${side} sheet scrolls and does not drag @desktop`, async ({ page }) => {
      const dialog = await openDrawer(page, side);
      await makeOverflow(dialog);
      const at = await centerOf(dialog.getByText(/Swipe the grab handle/));
      const cdp = await page.context().newCDPSession(page);
      // Negative yDistance scrolls the content down (finger moves up).
      await cdp.send("Input.synthesizeScrollGesture", {
        x: Math.round(at.x),
        y: Math.round(at.y),
        yDistance: -200,
        gestureSourceType: "touch",
        speed: 600,
      });
      await expect.poll(() => dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    });
  }

  for (const side of ["top", "right", "bottom", "left"] as const) {
    test(`a touch swipe from the ${side} drawer's zone dismisses it @desktop`, async ({ page }) => {
      const dialog = await openDrawer(page, side);
      const { zone, dx, dy } = SWIPE[side];
      const start = await centerOf(dialog.locator(zone));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      for (let i = 1; i <= 12; i++) {
        const point = { x: start.x + (dx * i) / 12, y: start.y + (dy * i) / 12 };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
        await page.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(dialog).toHaveCount(0);
    });
  }
});

type FrameProbe = { scope: string; text: string; target?: string; read: "dasharray" | "scale" | "opacity" };
type FrameState = { values: number[]; done: boolean };

/**
 * Records `read` on every animation frame for 800 ms from the moment the probed element mounts.
 * The element is the first `scope` match whose text includes `text` (or its `target` descendant).
 */
async function startFrameProbe(page: Page, probe: FrameProbe): Promise<void> {
  await page.evaluate(({ scope, text, target, read }) => {
    const state: FrameState = { values: [], done: false };
    (window as unknown as { __frames: FrameState }).__frames = state;
    const started = performance.now();
    let mounted = 0;
    const tick = (now: number) => {
      const host = Array.from(document.querySelectorAll(scope)).find((el) => el.textContent?.includes(text));
      const el = host && target ? host.querySelector(target) : host;
      if (el) {
        mounted ||= now;
        const style = getComputedStyle(el);
        state.values.push(
          read === "dasharray"
            ? parseFloat(el.getAttribute("stroke-dasharray") ?? "NaN")
            : read === "scale"
              ? new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform).a
              : parseFloat(style.opacity),
        );
      }
      if ((mounted && now - mounted > 800) || now - started > 5000) state.done = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, probe);
}

async function probedFrames(page: Page): Promise<number[]> {
  await page.waitForFunction(() => (window as unknown as { __frames?: FrameState }).__frames?.done === true);
  return page.evaluate(() => (window as unknown as { __frames: FrameState }).__frames.values);
}

// The first render shows the final state (server HTML included); later changes still animate.
test.describe("state change animations", () => {
  test("checking a Checkbox draws the check mark @desktop", async ({ page }) => {
    await openPage(page, "#/components/checkbox");
    const stage = page.getByTestId("preview-stage");
    await expect(stage.getByRole("checkbox", { name: "Cheese" }).locator("[data-pui-check] path")).toHaveAttribute(
      "stroke-dasharray",
      /^1(px)? /,
    );
    await startFrameProbe(page, { scope: '[data-testid="preview-stage"] label', text: "Basil", target: "path", read: "dasharray" });
    await stage.getByRole("checkbox", { name: "Basil" }).click();
    const values = await probedFrames(page);
    expect(values.some((v) => v > 0.02 && v < 0.98), values.join(", ")).toBe(true);
    expect(values.at(-1)).toBeCloseTo(1, 2);
  });

  test("selecting a Radio scales the dot in @desktop", async ({ page }) => {
    await openPage(page, "#/components/radio-group");
    const stage = page.getByTestId("preview-stage");
    await expect(stage.getByRole("radio", { name: "Pro" }).locator("[data-pui-radio-dot]")).toBeVisible();
    await startFrameProbe(page, {
      scope: '[data-testid="preview-stage"] label',
      text: "Free",
      target: "[data-pui-radio-dot]",
      read: "scale",
    });
    await stage.getByRole("radio", { name: "Free" }).click();
    const values = await probedFrames(page);
    expect(values.some((v) => v > 0.02 && v < 0.95), values.join(", ")).toBe(true);
    expect(values.at(-1)).toBeCloseTo(1, 2);
  });

  test("switching tabs fades the incoming panel in @desktop", async ({ page }) => {
    await openPage(page, "#/components/tabs");
    const stage = page.getByTestId("preview-stage");
    await expect(stage.getByRole("tabpanel")).toHaveCSS("opacity", "1");
    await startFrameProbe(page, { scope: '[data-testid="preview-stage"] [role="tabpanel"]', text: "Recent commits", read: "opacity" });
    await stage.getByRole("tab", { name: "Activity" }).click();
    const values = await probedFrames(page);
    expect(values.some((v) => v > 0.02 && v < 0.98), values.join(", ")).toBe(true);
    expect(values.at(-1)).toBe(1);
  });
});

test("reduced motion: home has no errors and the Marquee does not animate @desktop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "#/");
  const card = page.locator('[data-testid="bento-card"][data-slug="marquee"]');
  await card.scrollIntoViewIfNeeded();
  const copies = card.locator("[data-pui-marquee-copy]");
  await expect(copies.first()).toBeAttached();
  const names = await copies.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names)).toEqual(new Set(["none"]));
  await expect(card.locator('[data-state="static"]').first()).toBeAttached();
});
