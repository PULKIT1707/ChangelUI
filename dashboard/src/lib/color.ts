// Contrast math for the Theming page's live token table. Token values are read with
// getComputedStyle (custom properties come back as declared, e.g. "oklch(0.5 0.1 250)").

type Rgb = [number, number, number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    clamp01(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    clamp01(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
  ];
}

const num = (token: string, percentScale = 1) =>
  token.endsWith("%") ? (parseFloat(token) / 100) * percentScale : parseFloat(token);

/** Parses opaque oklch() and rgb() colors to linear sRGB; returns null for anything else (or alpha < 1). */
export function parseColor(value: string): Rgb | null {
  const text = value.trim();
  const fn = /^(oklch|rgba?)\(([^)]*)\)$/i.exec(text);
  if (!fn?.[1] || fn[2] === undefined) return null;
  const [main = "", alpha] = fn[2].split("/");
  const parts = main.trim().split(/[\s,]+/).filter(Boolean);
  const alphaValue = alpha !== undefined ? num(alpha.trim()) : parts[3] !== undefined ? num(parts[3]) : 1;
  if (alphaValue < 1 || parts.length < 3) return null;
  const [p0 = "0", p1 = "0", p2 = "0"] = parts;
  if (fn[1].toLowerCase() === "oklch") return oklchToLinearSrgb(num(p0), num(p1, 0.4), parseFloat(p2));
  return [p0, p1, p2].map((p) => toLinear(clamp01(num(p, 255) / 255))) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, or null when either color cannot be parsed. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
