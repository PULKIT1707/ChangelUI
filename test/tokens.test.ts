import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { durations, easings } from "../src/lib/motion";
import {
  composite,
  contrastRatio,
  mixOklab,
  parseColor,
  parseRules,
  resolveVars,
  themeBlockBody,
  type Color,
} from "./utils/contrast";

const css = readFileSync(join(import.meta.dirname, "../src/styles/theme.css"), "utf8");
const rules = parseRules(css);
const tokenRules = rules.filter((r) => !r.inAtRule && [...r.declarations.keys()].some((k) => k.startsWith("--pui-")));

const SELECTORS = [
  ":root",
  '.light, [data-theme="light"]',
  '.dark, [data-theme="dark"]',
  ':root, .light, [data-theme="light"], .dark, [data-theme="dark"], [data-pui-scope]',
];

const [rootBlock, lightBlock, darkBlock, derivedBlock] = tokenRules;
const puiEntries = (rule: (typeof rules)[number] | undefined) =>
  [...(rule?.declarations ?? new Map<string, string>())].filter(([k]) => k.startsWith("--pui-"));

describe("theme.css block structure (design 5.10)", () => {
  it("has exactly four token rules with the fixed selectors, in order", () => {
    expect(tokenRules.map((r) => r.selector)).toEqual(SELECTORS);
  });

  it("uses [data-pui-scope] only in the derived block", () => {
    const withScope = rules.filter((r) => r.selector.includes("data-pui-scope"));
    expect(withScope).toEqual([derivedBlock]);
  });

  it("keeps every var(--pui-*) declaration in the derived block, and only those", () => {
    for (const block of [rootBlock, lightBlock, darkBlock]) {
      for (const [prop, value] of puiEntries(block)) expect(value, prop).not.toContain("var(--pui-");
    }
    const derived = puiEntries(derivedBlock);
    expect(derived.length).toBeGreaterThan(0);
    for (const [prop, value] of derived) expect(value, prop).toContain("var(--pui-");
    expect([...(derivedBlock?.declarations.keys() ?? [])].every((k) => k.startsWith("--pui-"))).toBe(true);
  });

  it("declares the same property names in the light and dark blocks", () => {
    const names = (block: typeof lightBlock) => [...(block?.declarations.keys() ?? [])].sort();
    expect(names(lightBlock)).toEqual(names(darkBlock));
    expect(lightBlock?.declarations.get("color-scheme")).toBe("light");
    expect(darkBlock?.declarations.get("color-scheme")).toBe("dark");
  });

  it(":root repeats every light token with the same value and sets no color-scheme", () => {
    expect(rootBlock?.declarations.has("color-scheme")).toBe(false);
    for (const [prop, value] of puiEntries(lightBlock)) expect(rootBlock?.declarations.get(prop), prop).toBe(value);
  });

  it("maps every color token into @theme inline and defines every pui keyframe there", () => {
    const theme = themeBlockBody(css);
    expect(css).toMatch(/@theme inline\s*\{/);
    for (const [prop] of puiEntries(lightBlock)) {
      const name = prop.slice("--pui-".length);
      if (name.startsWith("shadow-")) expect(theme).toContain(`--shadow-pui-${name.slice(7)}: var(${prop})`);
      else expect(theme).toContain(`--color-pui-${name}: var(${prop})`);
    }
    for (const [, value] of theme.matchAll(/--animate-(pui-[\w-]+):/g)) {
      expect(theme).toContain(`@keyframes ${value}`);
    }
  });
});

type Theme = "light" | "dark";

function themeTokens(theme: Theme): Map<string, string> {
  const map = new Map<string, string>();
  for (const [k, v] of puiEntries(rootBlock)) map.set(k, v);
  for (const [k, v] of puiEntries(theme === "light" ? lightBlock : darkBlock)) map.set(k, v);
  for (const [k, v] of puiEntries(derivedBlock)) map.set(k, v);
  return map;
}

function color(theme: Theme, name: string): Color {
  const tokens = themeTokens(theme);
  return parseColor(resolveVars(`var(--pui-${name})`, tokens));
}

const TONES = ["primary", "success", "warning", "danger", "info"] as const;

describe.each(["light", "dark"] as const)("contrast, %s theme (WCAG 2.2 AA intent)", (theme) => {
  const c = (name: string) => color(theme, name);
  const bg = c("background");
  const expectRatio = (fg: Color, back: Color, min: number, label: string) => {
    const ratio = contrastRatio(fg, back);
    expect(ratio, `${theme}: ${label} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  };

  it("foreground on background and surface", () => {
    expectRatio(c("foreground"), bg, 4.5, "foreground/background");
    expectRatio(c("surface-foreground"), c("surface"), 4.5, "surface-foreground/surface");
    expectRatio(c("foreground"), c("surface"), 4.5, "foreground/surface");
  });

  it("muted-foreground on background, surface and muted", () => {
    for (const back of ["background", "surface", "muted"]) {
      expectRatio(c("muted-foreground"), c(back), 4.5, `muted-foreground/${back}`);
    }
  });

  it.each(TONES)("%s tone", (tone) => {
    expectRatio(c(`${tone}-foreground`), c(tone), 4.5, `${tone}-foreground/${tone}`);
    expectRatio(c(`${tone}-text`), bg, 4.5, `${tone}-text/background`);
    expectRatio(c(`${tone}-text`), c("surface"), 4.5, `${tone}-text/surface`);
    expectRatio(c(`${tone}-text`), mixOklab(c(tone), bg, 0.12), 4.5, `${tone}-text/color-mix(${tone} 12%, background)`);
  });

  it("control boundary and focus ring reach 3:1", () => {
    expectRatio(c("input"), bg, 3, "input/background");
    expectRatio(c("ring"), bg, 3, "ring/background");
  });

  it("foreground on highlight composited over background", () => {
    const highlight = c("highlight");
    expect(highlight.alpha).toBeLessThan(1);
    expectRatio(c("foreground"), composite(highlight, bg), 4.5, "foreground/highlight");
  });
});

describe("contrast math", () => {
  it("matches known sRGB anchors", () => {
    const white = parseColor("oklch(1 0 0)");
    const black = parseColor("oklch(0 0 0)");
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });

  it("gamut-clamps out-of-range chroma and composites alpha", () => {
    const vivid = parseColor("oklch(0.7 0.4 150)");
    for (const ch of vivid.rgb) expect(ch >= 0 && ch <= 1).toBe(true);
    const half = composite(parseColor("oklch(0 0 0 / 0.5)"), parseColor("oklch(1 0 0)"));
    expect(half.rgb[0]).toBeGreaterThan(0.2);
    expect(half.rgb[0]).toBeLessThan(0.25);
  });
});

describe("motion.ts mirrors the CSS tokens", () => {
  const tokens = themeTokens("light");
  it("durations", () => {
    for (const [name, seconds] of Object.entries(durations)) {
      expect(tokens.get(`--pui-duration-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`);
    }
  });

  it("easings", () => {
    const cssName = {
      out: "out",
      inOut: "in-out",
      spring: "spring",
      outExpo: "out-expo",
      inQuint: "in-quint",
      emphasized: "emphasized",
    } as const;
    for (const [name, points] of Object.entries(easings)) {
      const value = tokens.get(`--pui-ease-${cssName[name as keyof typeof cssName]}`);
      expect(value).toBe(`cubic-bezier(${points.join(", ")})`);
    }
  });
});
