// Minimal CSS parsing and WCAG contrast math for test/tokens.test.ts (design 11.2).

export interface CssRule {
  selector: string;
  /** property -> value, in source order */
  declarations: Map<string, string>;
  /** true for rules nested inside an at-rule block such as @theme */
  inAtRule: boolean;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseDeclarations(body: string): Map<string, string> {
  const map = new Map<string, string>();
  let depth = 0;
  let start = 0;
  const push = (chunk: string) => {
    const i = chunk.indexOf(":");
    if (i === -1) return;
    const prop = chunk.slice(0, i).trim();
    const value = chunk.slice(i + 1).trim().replace(/\s+/g, " ");
    if (prop) map.set(prop, value);
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      push(body.slice(start, i));
      start = i + 1;
    }
  }
  push(body.slice(start));
  return map;
}

/** Parses top-level rules plus one level of rules nested inside at-rules (enough for theme.css). */
export function parseRules(source: string): CssRule[] {
  const css = stripComments(source);
  const rules: CssRule[] = [];
  const parseLevel = (text: string, inAtRule: boolean) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      // a prelude may be preceded by declarations of the parent block (e.g. inside @theme)
      const selector = prelude.slice(prelude.lastIndexOf(";") + 1).trim();
      if (selector.startsWith("@")) {
        if (!selector.startsWith("@keyframes")) parseLevel(body, true);
      } else {
        rules.push({ selector: selector.replace(/\s+/g, " "), declarations: parseDeclarations(body), inAtRule });
      }
      i = j;
    }
  };
  parseLevel(css, false);
  return rules;
}

/** Returns the body of the first `@theme ...{}` block. */
export function themeBlockBody(source: string): string {
  const css = stripComments(source);
  const start = css.indexOf("@theme");
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  let depth = 1;
  let j = open + 1;
  while (j < css.length && depth > 0) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}") depth--;
    j++;
  }
  return css.slice(open + 1, j - 1);
}

export type Rgb = [number, number, number];
export interface Color {
  /** linear sRGB, gamut-clamped to [0, 1] */
  rgb: Rgb;
  alpha: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function parseNumber(token: string, percentScale = 1): number {
  return token.endsWith("%") ? (parseFloat(token) / 100) * percentScale : parseFloat(token);
}

/** oklch() -> oklab [L, a, b] plus alpha. */
export function parseOklch(value: string): { lab: [number, number, number]; alpha: number } {
  const match = /^oklch\(\s*([^)]+)\)$/.exec(value.trim());
  if (!match?.[1]) throw new Error(`not an oklch() color: ${value}`);
  const [main = "", alphaPart] = match[1].split("/");
  const [l = "0", c = "0", h = "0"] = main.trim().split(/\s+/);
  const L = parseNumber(l);
  const C = parseNumber(c, 0.4);
  const H = (parseFloat(h) * Math.PI) / 180;
  const alpha = alphaPart === undefined ? 1 : parseNumber(alphaPart.trim());
  return { lab: [L, C * Math.cos(H), C * Math.sin(H)], alpha };
}

export function oklabToLinearSrgb([L, a, b]: [number, number, number]): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function linearSrgbToOklab([r, g, b]: Rgb): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363371362 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function parseColor(value: string): Color {
  const { lab, alpha } = parseOklch(value);
  return { rgb: oklabToLinearSrgb(lab), alpha };
}

const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Source-over compositing of `top` onto an opaque `bottom`, in gamma-encoded sRGB like browsers. */
export function composite(top: Color, bottom: Color): Color {
  const rgb = top.rgb.map((c, i) =>
    toLinear(top.alpha * toGamma(c) + (1 - top.alpha) * toGamma(bottom.rgb[i] as number)),
  ) as Rgb;
  return { rgb, alpha: 1 };
}

/** color-mix(in oklab, a p, b): interpolate in Oklab, then back to (clamped) linear sRGB. */
export function mixOklab(a: Color, b: Color, weightA: number): Color {
  const la = linearSrgbToOklab(a.rgb);
  const lb = linearSrgbToOklab(b.rgb);
  const lab = la.map((v, i) => v * weightA + (lb[i] as number) * (1 - weightA)) as [number, number, number];
  return { rgb: oklabToLinearSrgb(lab), alpha: 1 };
}

export function luminance({ rgb: [r, g, b] }: Color): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Color, b: Color): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Resolves var(--x) references (no fallbacks needed for theme.css) against a token map. */
export function resolveVars(value: string, tokens: ReadonlyMap<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`var() cycle while resolving ${value}`);
  return value.replace(/var\((--[\w-]+)\)/g, (_m, name: string) => {
    const next = tokens.get(name);
    if (next === undefined) throw new Error(`undefined token ${name}`);
    return resolveVars(next, tokens, depth + 1);
  });
}
