// Color math for ColorPicker: sRGB <-> HSV / HSL / OKLCH, parsing and formatting. Pure, server-safe.

/** Channels 0-255, alpha 0-1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** h 0-360, s and v 0-1, a 0-1. */
export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

export function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255, a };
}

export function rgbToHsv({ r, g, b, a }: Rgba, fallbackHue = 0): Hsva {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = fallbackHue;
  if (d > 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  return { h: wrapHue(h), s: max === 0 ? 0 : d / max, v: max, a };
}

function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const { h, s: sv, v } = rgbToHsv({ r, g, b, a: 1 });
  const l = v * (1 - sv / 2);
  const s = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number, a: number): Rgba {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return hsvToRgb({ h, s: sv, v, a });
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b, a }: Rgba): { l: number; c: number; h: number; a: number } {
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.sqrt(A * A + B * B);
  return { l: L, c, h: c < 1e-4 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI), a };
}

/** OKLCH to sRGB; `inGamut` is false when a channel had to be clipped. */
export function oklchToRgb(l: number, c: number, h: number, a = 1): Rgba & { inGamut: boolean } {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const inGamut = lin.every((x) => x >= -1e-4 && x <= 1 + 1e-4);
  const [r = 0, g = 0, b = 0] = lin.map((x) => clamp(fromLinear(clamp(x))) * 255);
  return { r, g, b, a, inGamut };
}

const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

export function formatColor(rgba: Rgba, format: ColorFormat, { alpha = true }: { alpha?: boolean } = {}): string {
  const a = alpha ? clamp(rgba.a) : 1;
  const hasAlpha = a < 1;
  switch (format) {
    case "rgb": {
      const ch = `${Math.round(rgba.r)} ${Math.round(rgba.g)} ${Math.round(rgba.b)}`;
      return hasAlpha ? `rgb(${ch} / ${round(a, 2)})` : `rgb(${ch})`; // pui-allow-color
    }
    case "hsl": {
      const { h, s, l } = rgbToHsl(rgba);
      const ch = `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
      return hasAlpha ? `hsl(${ch} / ${round(a, 2)})` : `hsl(${ch})`; // pui-allow-color
    }
    case "oklch": {
      const { l, c, h } = rgbToOklch(rgba);
      const ch = `${round(l * 100, 1)}% ${round(c, 3)} ${round(h, 1)}`;
      return hasAlpha ? `oklch(${ch} / ${round(a, 2)})` : `oklch(${ch})`; // pui-allow-color
    }
    default:
      return `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}${hasAlpha ? hex2(a * 255) : ""}`;
  }
}

function parseNumber(token: string | undefined, percentScale: number): number | null {
  if (token === undefined) return null;
  const t = token.trim();
  if (t === "none") return 0;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return t.endsWith("%") ? (n / 100) * percentScale : n;
}

function parseHue(token: string | undefined): number | null {
  if (token === undefined) return null;
  const t = token.trim().toLowerCase();
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return t === "none" ? 0 : null;
  if (t.endsWith("turn")) return n * 360;
  if (t.endsWith("rad")) return (n * 180) / Math.PI;
  if (t.endsWith("grad")) return n * 0.9;
  return n;
}

/** Parses #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), hsl() and oklch() (space or comma syntax). pui-allow-color */
export function parseColor(input: string): Rgba | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex?.[1]) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/.exec(text);
  if (!fn?.[1] || fn[2] === undefined) return null;
  const [main = "", alphaPart] = fn[2].split("/");
  const parts = main.split(/[\s,]+/).filter(Boolean);
  let alphaToken = alphaPart?.trim();
  if (alphaToken === undefined && parts.length === 4) alphaToken = parts.pop();
  if (parts.length !== 3) return null;
  const a = alphaToken === undefined ? 1 : parseNumber(alphaToken, 1);
  if (a === null) return null;
  const name = fn[1];
  if (name.startsWith("rgb")) {
    const [r, g, b] = parts.map((p) => parseNumber(p, 255));
    if (r == null || g == null || b == null) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a) };
  }
  if (name.startsWith("hsl")) {
    const h = parseHue(parts[0]);
    const s = parseNumber(parts[1]?.endsWith("%") ? parts[1] : `${parts[1]}%`, 1);
    const l = parseNumber(parts[2]?.endsWith("%") ? parts[2] : `${parts[2]}%`, 1);
    if (h === null || s === null || l === null) return null;
    return hslToRgb(wrapHue(h), clamp(s), clamp(l), clamp(a));
  }
  const l = parseNumber(parts[0], 1);
  const c = parseNumber(parts[1], 0.4);
  const h = parseHue(parts[2]);
  if (l === null || c === null || h === null) return null;
  const { r, g, b } = oklchToRgb(l > 1 ? l / 100 : l, Math.max(0, c), wrapHue(h));
  return { r, g, b, a: clamp(a) };
}

/** Relative luminance (WCAG) of an opaque color. */
export function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
}
