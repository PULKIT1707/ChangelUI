// Consumer browser checks (design 12.4). Run by scripts/consumer-test.ts through
// playwright.consumer.config.ts against `vite preview` of the packed consumers A and B.
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const consumers = [
  { id: "A", label: "react19-tailwind (Mode 1)", url: process.env.PUI_CONSUMER_A_URL },
  { id: "B", label: "react18-css (Mode 2)", url: process.env.PUI_CONSUMER_B_URL },
] as const;

const screenshotB = fileURLToPath(new URL("../dashboard/.screenshots/consumer-b.png", import.meta.url));

function urlFor(id: "A" | "B"): string {
  const url = consumers.find((c) => c.id === id)?.url;
  if (!url) throw new Error(`PUI_CONSUMER_${id}_URL is not set; run npm run test:consumer`);
  return url;
}

/** Opens a consumer page and records console errors and page errors. */
async function open(page: Page, id: "A" | "B"): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(urlFor(id));
  await expect(page.getByTestId("solid-button")).toBeVisible();
  await expect(page.getByTestId("toaster").locator("li")).toHaveCount(1);
  return errors;
}

/** Computes `prop` of a throwaway <span> styled with `style` and appended to <body>. */
function resolveStyle(page: Page, style: Record<string, string>, prop: string): Promise<string> {
  return page.evaluate(
    ([styleEntries, property]) => {
      const probe = document.createElement("span");
      for (const [key, value] of styleEntries) probe.style.setProperty(key, value);
      document.body.append(probe);
      const value = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return value;
    },
    [Object.entries(style), prop] as const,
  );
}

for (const consumer of consumers) {
  test.describe(`consumer ${consumer.id}: ${consumer.label}`, () => {
    let errors: string[] = [];
    test.beforeEach(async ({ page }) => {
      errors = await open(page, consumer.id);
    });
    test.afterEach(() => {
      expect(errors, "console errors / page errors").toEqual([]);
    });

    test("subpath imports are the same components as the root", async ({ page }) => {
      await expect(page.getByTestId("page")).toHaveAttribute("data-subpath-identity", "true");
    });

    test("solid Button paints the resolved --pui-primary", async ({ page }) => {
      const primary = await resolveStyle(page, { "background-color": "var(--pui-primary)" }, "background-color");
      const background = await page.getByTestId("solid-button").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(background).not.toBe("rgba(0, 0, 0, 0)");
      expect(background).not.toBe("transparent");
      expect(background).toBe(primary);
    });

    test("keyboard focus shows a 2px+ outline ring", async ({ page }) => {
      await page.keyboard.press("Tab");
      const button = page.getByTestId("solid-button");
      await expect(button).toBeFocused();
      const ring = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      expect(ring.style).not.toBe("none");
      expect(ring.width).toBeGreaterThanOrEqual(2);
    });

    test("Dialog opens and Escape closes it", async ({ page }) => {
      const trigger = page.getByTestId("dialog-trigger");
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Consumer dialog" });
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test("Switch toggles", async ({ page }) => {
      const toggle = page.getByRole("switch", { name: "Notifications" });
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await toggle.press("Space");
      await expect(toggle).toHaveAttribute("aria-checked", "false");
    });
  });
}

// Mode 2 has no preflight, so these prove the design 5.12 resets in dist/styles.css.
test.describe("consumer B only: styles.css without preflight", () => {
  let errors: string[] = [];
  test.beforeEach(async ({ page }) => {
    errors = await open(page, "B");
  });
  test.afterEach(() => {
    expect(errors, "console errors / page errors").toEqual([]);
  });

  test("Buttons have no UA border; ghost is transparent", async ({ page }) => {
    const read = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const style = getComputedStyle(el);
        return { border: style.borderTopWidth, background: style.backgroundColor };
      });
    const solid = await read("solid-button");
    const ghost = await read("ghost-button");
    expect(solid.border).toBe("0px");
    expect(ghost.border).toBe("0px");
    expect(ghost.background).toBe("rgba(0, 0, 0, 0)");
    // The outline Button inside DialogTrigger asChild keeps its own border and padding.
    const trigger = await page.getByTestId("dialog-trigger").evaluate((el) => {
      const style = getComputedStyle(el);
      return { border: style.borderTopWidth, paddingLeft: parseFloat(style.paddingLeft) };
    });
    expect(trigger.border).toBe("1px");
    expect(trigger.paddingLeft).toBeGreaterThan(0);
  });

  test("Toaster list has no markers or UA padding and stays in the viewport", async ({ page }) => {
    const list = await page
      .getByTestId("toaster")
      .locator("ol")
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          listStyle: style.listStyleType,
          paddingLeft: style.paddingLeft,
          boxSizing: style.boxSizing,
          right: el.getBoundingClientRect().right,
          clientWidth: document.documentElement.clientWidth,
        };
      });
    expect(list.listStyle).toBe("none");
    expect(list.paddingLeft).toBe("16px");
    expect(list.boxSizing).toBe("border-box");
    expect(list.right).toBeLessThanOrEqual(list.clientWidth);
  });

  test("Dialog title has no UA margin; content is border-box", async ({ page }) => {
    await page.getByTestId("dialog-trigger").click();
    const dialog = page.getByTestId("dialog");
    await expect(dialog).toBeVisible();
    expect(await page.getByTestId("dialog-title").evaluate((el) => getComputedStyle(el).marginTop)).toBe("0px");
    expect(await dialog.evaluate((el) => getComputedStyle(el).boxSizing)).toBe("border-box");
  });

  test("md Slider thumb is 20px wide", async ({ page }) => {
    const width = await page
      .getByRole("slider", { name: "Volume" })
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBe(20);
  });

  test("fullWidth TabsList does not overflow its 320px parent", async ({ page }) => {
    const sizes = await page.getByTestId("tabs-list").evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      parentWidth: el.parentElement?.clientWidth ?? 0,
    }));
    expect(sizes.parentWidth).toBe(320);
    expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.parentWidth);
  });

  test("full-page screenshot for the visual review", async ({ page }) => {
    // Let the Motion entrances (toast, tab panel) finish so the screenshot shows the settled page.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll('[role="tabpanel"], [data-pui-toast-id]')].every(
            (el) => getComputedStyle(el).opacity === "1",
          ),
        ),
      )
      .toBe(true);
    await page.screenshot({ path: screenshotB, fullPage: true, animations: "disabled" });
  });
});
