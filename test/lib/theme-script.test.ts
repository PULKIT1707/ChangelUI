import { afterEach, describe, expect, it, vi } from "vitest";
import { getThemeInitScript, type ThemeInitScriptOptions } from "../../src/lib/theme-script";
import { setMediaQuery } from "../utils/env";

const html = document.documentElement;

function run(options?: ThemeInitScriptOptions): void {
  // The script is a self-contained IIFE string, inlined in <head> by consumers.
  new Function(getThemeInitScript(options))();
}

afterEach(() => {
  html.className = "";
  html.removeAttribute("data-theme");
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("getThemeInitScript", () => {
  it.each(["dark", "light"] as const)("applies a stored %s theme as class and data-theme", (theme) => {
    localStorage.setItem("pui-theme", theme);
    run();
    expect(html.classList.contains(theme)).toBe(true);
    expect(html.getAttribute("data-theme")).toBe(theme);
  });

  it("replaces the opposite theme class", () => {
    html.classList.add("light");
    localStorage.setItem("pui-theme", "dark");
    run();
    expect(html.className).toBe("dark");
  });

  it("resolves system through matchMedia", () => {
    localStorage.setItem("pui-theme", "system");
    setMediaQuery("(prefers-color-scheme: dark)", true);
    run();
    expect(html.getAttribute("data-theme")).toBe("dark");
    setMediaQuery("(prefers-color-scheme: dark)", false);
    run();
    expect(html.getAttribute("data-theme")).toBe("light");
  });

  it("ignores invalid stored values and uses defaultTheme", () => {
    localStorage.setItem("pui-theme", "purple");
    run();
    expect(html.getAttribute("data-theme")).toBe("light");
    run({ defaultTheme: "dark" });
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("honors storageKey and attribute", () => {
    localStorage.setItem("my-key", "dark");
    run({ storageKey: "my-key", attribute: "class" });
    expect(html.classList.contains("dark")).toBe(true);
    expect(html.hasAttribute("data-theme")).toBe(false);
    html.className = "";
    run({ storageKey: "my-key", attribute: "data-theme" });
    expect(html.className).toBe("");
    expect(html.getAttribute("data-theme")).toBe("dark");
  });

  it("does not throw when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => run()).not.toThrow();
    expect(html.getAttribute("data-theme")).toBe("light");
  });

  it("cannot break out of an inline <script>", () => {
    const script = getThemeInitScript({ storageKey: "</script><script>alert(1)</script>" });
    expect(script).not.toContain("</script");
    expect(() => new Function(script)()).not.toThrow();
  });
});
