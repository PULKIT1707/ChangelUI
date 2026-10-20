// Theme presets and the theme builder (roadmap C.2). Pure data and functions with no imports, so it
// is server-safe (no "use client"), usable at build time, and run directly by Node in
// scripts/build-themes.ts, which writes src/styles/themes.css from the same presets.
//
// A theme is derived from a few seeds (primary hue and chroma, neutral tint, accent hues, radius and
// font) in OKLCH. Every text and control pair is then nudged in lightness until it meets WCAG
// contrast (4.5:1 text, 3:1 input and ring), so a custom hue never produces unreadable buttons.

/** Mode-dependent color tokens a theme sets, as --pui-<name>. */
export const themeTokenNames = [
  "background",
  "foreground",
  "surface",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "ring",
  "overlay",
  "primary",
  "primary-foreground",
  "primary-text",
  "success",
  "success-foreground",
  "success-text",
  "warning",
  "warning-foreground",
  "warning-text",
  "danger",
  "danger-foreground",
  "danger-text",
  "info",
  "info-foreground",
  "info-text",
  "highlight",
  "beam-from",
  "beam-to",
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "aurora-1",
  "aurora-2",
  "aurora-3",
  "spotlight",
  "shimmer-bg",
  "shimmer-fg",
  "shimmer",
  "skeleton-highlight",
  "solid-highlight",
  "pattern",
  "ripple",
  "particle",
  "aurora-veil",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-seq-from",
  "chart-seq-to",
  "chart-div-neg",
  "chart-div-pos",
] as const;

export type ThemeTokenName = (typeof themeTokenNames)[number];
export type ThemeTokens = Record<ThemeTokenName, string>;
export type ThemeMode = "light" | "dark";

/** Font pairing: "serif" and "mono" change display text only; "rounded" changes body text too. */
export type ThemeFont = "system" | "rounded" | "serif" | "mono";

export interface ThemeConstants {
  radius: string;
  fontSans: string;
  fontDisplay: string;
  fontMono: string;
  overlayBlur: string;
  surfaceBlur: string;
}

export const presetNames = [
  "default",
  "midnight",
  "sunset",
  "forest",
  "mono",
  "neon",
  "pastel",
  "glass",
  "ocean",
  "rose",
] as const;

export type ThemePresetName = (typeof presetNames)[number];

export interface ThemePreset {
  name: ThemePresetName;
  label: string;
  description: string;
  /** Primary hue (0-360) and chroma (0-0.37). */
  hue: number;
  chroma: number;
  /** Tint of the neutrals (backgrounds, borders, muted text). */
  neutralHue: number;
  neutralChroma: number;
  /** Two accent hues for gradients, beams and auroras. */
  accents: readonly [number, number];
  radius: string;
  font: ThemeFont;
  /** Text color on primary in light mode. Default "light" (white text on a darker primary). */
  onPrimary?: "light" | "dark";
  /** Primary follows the foreground when chroma is 0 (the mono preset). */
  monochrome?: boolean;
  overlayBlur?: string;
  surfaceBlur?: string;
  /** Hand-tuned token overrides, applied after derivation. */
  light?: Partial<ThemeTokens>;
  dark?: Partial<ThemeTokens>;
  /** Extra declarations on the preset element (custom properties only). */
  extra?: Record<string, string>;
}

const SANS = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const ROUNDED = 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, ui-sans-serif, system-ui, sans-serif';
const SERIF = 'ui-serif, "New York", "Iowan Old Style", "Apple Garamond", Baskerville, Georgia, Cambria, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace';

export const fontStacks = { sans: SANS, rounded: ROUNDED, serif: SERIF, mono: MONO } as const;

/** The current theme.css values (the "default" preset), so a default island resets every token. */
const DEFAULT_LIGHT: ThemeTokens = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.141 0.005 285.823)",
  surface: "oklch(1 0 0)",
  muted: "oklch(0.967 0.001 286.375)",
  "muted-foreground": "oklch(0.5 0.016 286)",
  border: "oklch(0.92 0.004 286.32)",
  input: "oklch(0.65 0.015 286)",
  ring: "oklch(0.585 0.233 277.117)",
  overlay: "oklch(0.141 0.005 285.823 / 0.4)",
  primary: "oklch(0.511 0.262 276.966)",
  "primary-foreground": "oklch(0.985 0 0)",
  "primary-text": "oklch(0.457 0.24 277.023)",
  success: "oklch(0.527 0.154 150.069)",
  "success-foreground": "oklch(0.985 0 0)",
  "success-text": "oklch(0.448 0.119 151.328)",
  warning: "oklch(0.769 0.188 70.08)",
  "warning-foreground": "oklch(0.279 0.077 45.635)",
  "warning-text": "oklch(0.473 0.137 46.201)",
  danger: "oklch(0.577 0.245 27.325)",
  "danger-foreground": "oklch(0.985 0 0)",
  "danger-text": "oklch(0.505 0.213 27.518)",
  info: "oklch(0.5 0.134 242.749)",
  "info-foreground": "oklch(0.985 0 0)",
  "info-text": "oklch(0.443 0.11 240.79)",
  highlight: "oklch(0.905 0.182 98.111 / 0.6)",
  "beam-from": "oklch(0.585 0.233 277.117)",
  "beam-to": "oklch(0.667 0.295 322.15)",
  "gradient-1": "oklch(0.511 0.262 276.966)",
  "gradient-2": "oklch(0.591 0.293 322.896)",
  "gradient-3": "oklch(0.645 0.246 16.439)",
  "aurora-1": "oklch(0.58 0.22 277)",
  "aurora-2": "oklch(0.64 0.17 233)",
  "aurora-3": "oklch(0.62 0.26 322)",
  spotlight: "oklch(0.585 0.233 277.117 / 0.12)",
  "shimmer-bg": "oklch(0.141 0.005 285.823)",
  "shimmer-fg": "oklch(0.985 0 0)",
  shimmer: "oklch(1 0 0)",
  "skeleton-highlight": "oklch(0.985 0 0)",
  "solid-highlight": "oklch(1 0 0 / 0.2)",
  pattern: "oklch(0.5 0.016 286 / 0.7)",
  ripple: "oklch(0.511 0.262 276.966 / 0.85)",
  particle: "oklch(0.45 0.12 277)",
  "aurora-veil": "oklch(1 0 0 / 0.25)",
  "chart-1": "oklch(0.55 0.22 277)",
  "chart-2": "oklch(0.66 0.13 190)",
  "chart-3": "oklch(0.75 0.16 70)",
  "chart-4": "oklch(0.58 0.21 20)",
  "chart-5": "oklch(0.6 0.2 330)",
  "chart-6": "oklch(0.5 0.12 245)",
  "chart-7": "oklch(0.68 0.16 140)",
  "chart-8": "oklch(0.52 0.04 60)",
  "chart-seq-from": "oklch(0.96 0.03 277)",
  "chart-seq-to": "oklch(0.42 0.2 277)",
  "chart-div-neg": "oklch(0.58 0.19 35)",
  "chart-div-pos": "oklch(0.52 0.15 245)",
};

const DEFAULT_DARK: ThemeTokens = {
  background: "oklch(0.141 0.005 285.823)",
  foreground: "oklch(0.985 0 0)",
  surface: "oklch(0.21 0.006 285.885)",
  muted: "oklch(0.274 0.006 286.033)",
  "muted-foreground": "oklch(0.705 0.015 286.067)",
  border: "oklch(0.274 0.006 286.033)",
  input: "oklch(0.552 0.016 285.938)",
  ring: "oklch(0.673 0.182 276.935)",
  overlay: "oklch(0 0 0 / 0.6)",
  primary: "oklch(0.673 0.182 276.935)",
  "primary-foreground": "oklch(0.141 0.005 285.823)",
  "primary-text": "oklch(0.785 0.115 274.713)",
  success: "oklch(0.723 0.219 149.579)",
  "success-foreground": "oklch(0.141 0.005 285.823)",
  "success-text": "oklch(0.792 0.209 151.711)",
  warning: "oklch(0.828 0.189 84.429)",
  "warning-foreground": "oklch(0.141 0.005 285.823)",
  "warning-text": "oklch(0.879 0.169 91.605)",
  danger: "oklch(0.577 0.245 27.325)",
  "danger-foreground": "oklch(0.985 0 0)",
  "danger-text": "oklch(0.704 0.191 22.216)",
  info: "oklch(0.746 0.16 232.661)",
  "info-foreground": "oklch(0.141 0.005 285.823)",
  "info-text": "oklch(0.828 0.111 230.318)",
  highlight: "oklch(0.795 0.184 86.047 / 0.35)",
  "beam-from": "oklch(0.585 0.233 277.117)",
  "beam-to": "oklch(0.667 0.295 322.15)",
  "gradient-1": "oklch(0.673 0.182 276.935)",
  "gradient-2": "oklch(0.74 0.238 322.16)",
  "gradient-3": "oklch(0.712 0.194 13.428)",
  "aurora-1": "oklch(0.673 0.182 276.935)",
  "aurora-2": "oklch(0.746 0.16 232.661)",
  "aurora-3": "oklch(0.74 0.238 322.16)",
  spotlight: "oklch(0.673 0.182 276.935 / 0.18)",
  "shimmer-bg": "oklch(0.141 0.005 285.823)",
  "shimmer-fg": "oklch(0.985 0 0)",
  shimmer: "oklch(1 0 0)",
  "skeleton-highlight": "oklch(0.37 0.013 285.805)",
  "solid-highlight": "oklch(1 0 0 / 0.12)",
  pattern: "oklch(0.705 0.015 286 / 0.38)",
  ripple: "oklch(0.785 0.115 274.713 / 0.55)",
  particle: "oklch(0.85 0.05 277)",
  "aurora-veil": "oklch(0.141 0.005 285.823)",
  "chart-1": "oklch(0.7 0.17 277)",
  "chart-2": "oklch(0.76 0.12 190)",
  "chart-3": "oklch(0.82 0.15 75)",
  "chart-4": "oklch(0.7 0.18 22)",
  "chart-5": "oklch(0.72 0.17 330)",
  "chart-6": "oklch(0.74 0.12 240)",
  "chart-7": "oklch(0.78 0.15 140)",
  "chart-8": "oklch(0.72 0.03 60)",
  "chart-seq-from": "oklch(0.28 0.06 277)",
  "chart-seq-to": "oklch(0.85 0.13 277)",
  "chart-div-neg": "oklch(0.72 0.16 35)",
  "chart-div-pos": "oklch(0.72 0.13 245)",
};

const neonGlow =
  "0 0 0 1px color-mix(in oklab, var(--pui-primary) 55%, transparent), 0 0 18px -2px color-mix(in oklab, var(--pui-primary) 65%, transparent), 0 0 42px -6px color-mix(in oklab, var(--pui-gradient-2) 55%, transparent)";

export const themePresets: Record<ThemePresetName, ThemePreset> = {
  default: {
    name: "default",
    label: "Default",
    description: "The library's indigo: crisp neutrals and a vivid primary.",
    hue: 277,
    chroma: 0.24,
    neutralHue: 286,
    neutralChroma: 0.006,
    accents: [322, 16],
    radius: "0.625rem",
    font: "system",
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    description: "Deep navy surfaces with a cool cyan accent.",
    hue: 235,
    chroma: 0.15,
    neutralHue: 255,
    neutralChroma: 0.03,
    accents: [200, 275],
    radius: "0.75rem",
    font: "system",
    light: { background: "oklch(0.985 0.005 250)" },
    dark: { background: "oklch(0.16 0.03 255)", surface: "oklch(0.21 0.034 255)" },
  },
  sunset: {
    name: "sunset",
    label: "Sunset",
    description: "Warm coral fading into pink, on sun-warmed neutrals.",
    hue: 30,
    chroma: 0.2,
    neutralHue: 60,
    neutralChroma: 0.014,
    accents: [350, 62],
    radius: "0.875rem",
    font: "system",
  },
  forest: {
    name: "forest",
    label: "Forest",
    description: "Moss and emerald with earthy, low-contrast greys.",
    hue: 155,
    chroma: 0.14,
    neutralHue: 140,
    neutralChroma: 0.014,
    accents: [120, 185],
    radius: "0.5rem",
    font: "system",
  },
  mono: {
    name: "mono",
    label: "Mono",
    description: "Editorial grayscale with serif headings.",
    hue: 0,
    chroma: 0,
    neutralHue: 0,
    neutralChroma: 0,
    accents: [0, 0],
    radius: "0.375rem",
    font: "serif",
    monochrome: true,
  },
  neon: {
    name: "neon",
    label: "Neon",
    description: "Cyber magenta and cyan with a strong glow. Best in dark mode.",
    hue: 330,
    chroma: 0.25,
    neutralHue: 290,
    neutralChroma: 0.03,
    accents: [195, 290],
    radius: "0.25rem",
    font: "mono",
    dark: {
      background: "oklch(0.13 0.03 290)",
      surface: "oklch(0.18 0.04 290)",
      primary: "oklch(0.76 0.24 330)",
      ring: "oklch(0.76 0.24 330)",
      "primary-text": "oklch(0.84 0.16 330)",
    },
    extra: { "--pui-shadow-glow": neonGlow },
  },
  pastel: {
    name: "pastel",
    label: "Pastel",
    description: "Soft candy colors, round corners and dark text on a light primary.",
    hue: 300,
    chroma: 0.12,
    neutralHue: 300,
    neutralChroma: 0.02,
    accents: [350, 200],
    radius: "1rem",
    font: "rounded",
    onPrimary: "dark",
    dark: { primary: "oklch(0.8 0.11 300)", "gradient-1": "oklch(0.8 0.11 300)", "aurora-1": "oklch(0.8 0.11 300)" },
  },
  glass: {
    name: "glass",
    label: "Glass",
    description: "Translucent, blurred surfaces over a tinted canvas.",
    hue: 265,
    chroma: 0.2,
    neutralHue: 280,
    neutralChroma: 0.016,
    accents: [210, 320],
    radius: "1rem",
    font: "system",
    overlayBlur: "8px",
    surfaceBlur: "16px",
    light: {
      background: "oklch(0.965 0.018 265)",
      surface: "oklch(1 0 0 / 0.6)",
      muted: "oklch(0.92 0.02 265 / 0.6)",
      border: "oklch(0.3 0.03 265 / 0.12)",
    },
    dark: {
      background: "oklch(0.16 0.03 270)",
      surface: "oklch(0.25 0.01 280 / 0.55)",
      muted: "oklch(0.3 0.02 280 / 0.55)",
      border: "oklch(1 0 0 / 0.1)",
    },
  },
  ocean: {
    name: "ocean",
    label: "Ocean",
    description: "Teal and sea-blue with cool, airy neutrals.",
    hue: 200,
    chroma: 0.12,
    neutralHue: 220,
    neutralChroma: 0.016,
    accents: [170, 240],
    radius: "0.75rem",
    font: "system",
  },
  rose: {
    name: "rose",
    label: "Rose",
    description: "Elegant rose and wine with a blush tint.",
    hue: 10,
    chroma: 0.18,
    neutralHue: 15,
    neutralChroma: 0.012,
    accents: [345, 40],
    radius: "0.625rem",
    font: "system",
  },
};

// ---------------------------------------------------------------------------------------------
// Color math (OKLCH -> sRGB, WCAG contrast)

interface Oklch {
  l: number;
  c: number;
  h: number;
  alpha: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
const wrapHue = (h: number) => ((h % 360) + 360) % 360;

function format({ l, c, h, alpha }: Oklch): string {
  const base = `${round(clamp(l, 0, 1), 3)} ${round(Math.max(0, c), 3)} ${round(c === 0 ? 0 : wrapHue(h), 1)}`;
  return alpha < 1 ? `oklch(${base} / ${round(alpha, 2)})` : `oklch(${base})`;
}

const ok = (l: number, c: number, h: number, alpha = 1): Oklch => ({ l, c, h, alpha });

function parseOklch(value: string): Oklch | null {
  const match = /^oklch\(\s*([^)]*)\)$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const [main = "", alphaPart] = match[1].split("/");
  const parts = main.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const n = (text: string | undefined, percent: number) => {
    if (text === undefined || text === "none") return 0;
    return text.endsWith("%") ? (parseFloat(text) / 100) * percent : parseFloat(text);
  };
  const l = n(parts[0], 1);
  const c = n(parts[1], 0.4);
  const h = n(parts[2], 1);
  const alpha = alphaPart === undefined ? 1 : n(alphaPart.trim(), 1);
  if ([l, c, h, alpha].some((x) => Number.isNaN(x))) return null;
  return { l, c, h, alpha };
}

type Rgb = [number, number, number];

/** OKLCH to gamma-encoded sRGB in 0..1 (clipped to the gamut). */
function toSrgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear: Rgb = [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ];
  return linear.map((x) => {
    const v = clamp(x, 0, 1);
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  }) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Composites a translucent color over an opaque backdrop (in gamma-encoded sRGB, like browsers). */
function over(color: Oklch, backdrop: Oklch): Rgb {
  const top = toSrgb(color);
  if (color.alpha >= 1) return top;
  const bottom = toSrgb(backdrop);
  return top.map((v, i) => v * color.alpha + (bottom[i] ?? 0) * (1 - color.alpha)) as Rgb;
}

function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * WCAG 2 contrast ratio of two CSS oklch() colors (1 to 21). A translucent `a` is composited over
 * `b`; a translucent `b` is treated as opaque. Returns 1 for colors it cannot parse.
 */
export function contrast(a: string, b: string): number {
  const ca = parseOklch(a);
  const cb = parseOklch(b);
  if (!ca || !cb) return 1;
  const backdrop = { ...cb, alpha: 1 };
  return ratio(over(ca, backdrop), toSrgb(backdrop));
}

/** Moves `color` in lightness (away from `against`) until it meets `min` contrast. */
function ensure(color: Oklch, against: Oklch, min: number): Oklch {
  const backdrop = { ...against, alpha: 1 };
  const lighter = luminance(toSrgb(backdrop)) < 0.18;
  let next = color;
  for (let i = 0; i < 100; i++) {
    if (ratio(over(next, backdrop), toSrgb(backdrop)) >= min) return next;
    const l = next.l + (lighter ? 0.01 : -0.01);
    if (l < 0 || l > 1) break;
    next = { ...next, l };
  }
  return next;
}

/** Rotates an oklch() string's hue by `delta` degrees and scales its chroma. */
function shift(value: string, delta: number, chromaScale = 1): string {
  const parsed = parseOklch(value);
  if (!parsed) return value;
  return format({ ...parsed, h: parsed.h + delta, c: parsed.c * chromaScale });
}

// ---------------------------------------------------------------------------------------------
// Derivation

export interface ThemeBuildOptions {
  /** Start from this preset. Default "default". */
  preset?: ThemePresetName;
  /** Override the primary hue (0-360). Neutrals and accents rotate with it. */
  hue?: number;
  /** Override the primary chroma (0-0.37). */
  chroma?: number;
  /** Override the base radius, e.g. "0.5rem" or 8 (px). */
  radius?: string | number;
  /** Override the font pairing. */
  font?: ThemeFont;
  /** data-pui-theme value for the generated CSS. Default: the preset name. */
  name?: string;
  /** "preset": scoped to [data-pui-theme="<name>"] (default). "root": replaces the base theme. */
  selector?: "preset" | "root";
}

export interface ContrastWarning {
  mode: ThemeMode;
  /** Foreground token (--pui-<token>). */
  token: ThemeTokenName;
  /** Background token it was measured against. */
  against: ThemeTokenName;
  ratio: number;
  required: number;
}

export interface BuiltTheme {
  name: string;
  preset: ThemePresetName;
  light: ThemeTokens;
  dark: ThemeTokens;
  constants: ThemeConstants;
  /** Extra custom properties (e.g. a stronger --pui-shadow-glow). */
  extra: Record<string, string>;
  /** Pairs below their WCAG minimum after adjustment (normally empty). */
  warnings: ContrastWarning[];
}

const STATUS = ["success", "warning", "danger", "info"] as const;

function fontConstants(font: ThemeFont): Pick<ThemeConstants, "fontSans" | "fontDisplay" | "fontMono"> {
  switch (font) {
    case "rounded":
      return { fontSans: ROUNDED, fontDisplay: ROUNDED, fontMono: MONO };
    case "serif":
      return { fontSans: SANS, fontDisplay: SERIF, fontMono: MONO };
    case "mono":
      return { fontSans: SANS, fontDisplay: MONO, fontMono: MONO };
    default:
      return { fontSans: SANS, fontDisplay: SANS, fontMono: MONO };
  }
}

interface Seed {
  hue: number;
  chroma: number;
  neutralHue: number;
  neutralChroma: number;
  accents: readonly [number, number];
  onPrimary: "light" | "dark";
  monochrome: boolean;
}

function deriveLight(s: Seed): ThemeTokens {
  const nc = s.neutralChroma * 0.5;
  const n = (l: number, k = 1, alpha = 1) => ok(l, nc * k, s.neutralHue, alpha);
  const pc = s.chroma;
  const [a1, a2] = s.accents;
  const bg = nc > 0 ? n(0.992, 0.6) : ok(1, 0, 0);
  const fg = n(0.16, 2.4);
  const white = ok(0.985, 0, 0);
  let primary: Oklch;
  let onPrimary: Oklch;
  if (s.monochrome && pc === 0) {
    primary = n(0.2, 2);
    onPrimary = white;
  } else if (s.onPrimary === "dark") {
    onPrimary = ok(0.24, pc * 0.35, s.hue);
    primary = ensure(ok(0.8, pc, s.hue), onPrimary, 4.6);
  } else {
    onPrimary = white;
    primary = ensure(ok(0.56, pc, s.hue), white, 4.6);
  }
  const primaryText = s.monochrome && pc === 0 ? fg : ensure(ok(0.5, pc, s.hue), bg, 4.6);
  const ring = s.monochrome && pc === 0 ? n(0.55) : ensure(ok(0.6, pc * 0.9, s.hue), bg, 3.1);
  const delta = s.hue - 277;
  const chartScale = pc < 0.03 ? 0.55 : 1;
  const t: ThemeTokens = { ...DEFAULT_LIGHT };
  Object.assign(t, {
    background: format(bg),
    foreground: format(fg),
    surface: format(ok(1, 0, 0)),
    muted: format(n(0.962, 1.6)),
    "muted-foreground": format(ensure(n(0.5, 3), bg, 4.6)),
    border: format(n(0.915, 1.8)),
    input: format(ensure(n(0.66, 2.4), bg, 3.1)),
    ring: format(ring),
    overlay: format(n(0.16, 2.4, 0.4)),
    primary: format(primary),
    "primary-foreground": format(onPrimary),
    "primary-text": format(primaryText),
    "beam-from": format(ok(0.62, pc, s.hue)),
    "beam-to": format(ok(0.68, pc * 1.1, a1)),
    "gradient-1": format(primary.l > 0.7 ? ok(0.6, pc, s.hue) : primary),
    "gradient-2": format(ok(0.6, pc * 1.1, a1)),
    "gradient-3": format(ok(0.66, pc, a2)),
    "aurora-1": format(ok(0.6, pc * 0.9, s.hue)),
    "aurora-2": format(ok(0.66, pc * 0.75, a2)),
    "aurora-3": format(ok(0.62, pc, a1)),
    spotlight: format(ok(0.6, pc, s.hue, 0.12)),
    "shimmer-bg": format(fg),
    "skeleton-highlight": format(n(0.99, 0.6)),
    pattern: format(n(0.5, 3, 0.7)),
    ripple: format({ ...primary, alpha: 0.85 }),
    particle: format(ok(0.45, pc * 0.5, s.hue)),
    "chart-seq-from": format(ok(0.96, Math.min(0.03, pc * 0.2), s.hue)),
    "chart-seq-to": format(ok(0.42, pc * 0.85, s.hue)),
  } satisfies Partial<ThemeTokens>);
  for (let i = 1; i <= 8; i++) {
    const key = `chart-${i}` as ThemeTokenName;
    t[key] = shift(DEFAULT_LIGHT[key], delta, chartScale);
  }
  t["chart-1"] = format(ok(0.55, Math.max(pc, 0.06), s.hue));
  for (const tone of STATUS) t[`${tone}-text`] = format(ensure(parseOklch(t[`${tone}-text`]) ?? fg, bg, 4.6));
  return t;
}

function deriveDark(s: Seed): ThemeTokens {
  const nc = s.neutralChroma;
  const n = (l: number, k = 1, alpha = 1) => ok(l, nc * k, s.neutralHue, alpha);
  const pc = s.chroma;
  const [a1, a2] = s.accents;
  const bg = n(0.15, 1);
  const fg = n(0.985, 0.2);
  let primary: Oklch;
  let onPrimary: Oklch;
  if (s.monochrome && pc === 0) {
    primary = n(0.94, 1);
    onPrimary = bg;
  } else {
    onPrimary = bg;
    primary = ensure(ok(0.7, pc * 0.8, s.hue), bg, 4.8);
  }
  const primaryText = s.monochrome && pc === 0 ? fg : ensure(ok(0.8, pc * 0.55, s.hue), bg, 4.6);
  const ring = s.monochrome && pc === 0 ? n(0.6) : ensure(ok(0.68, pc * 0.75, s.hue), bg, 3.1);
  const delta = s.hue - 277;
  const chartScale = pc < 0.03 ? 0.55 : 1;
  const t: ThemeTokens = { ...DEFAULT_DARK };
  Object.assign(t, {
    background: format(bg),
    foreground: format(fg),
    surface: format(n(0.205, 1.1)),
    muted: format(n(0.27, 1.1)),
    "muted-foreground": format(ensure(n(0.71, 2), bg, 4.6)),
    border: format(n(0.28, 1.1)),
    input: format(ensure(n(0.55, 1.5), bg, 3.1)),
    ring: format(ring),
    primary: format(primary),
    "primary-foreground": format(onPrimary),
    "primary-text": format(primaryText),
    "beam-from": format(ok(0.65, pc, s.hue)),
    "beam-to": format(ok(0.7, pc * 1.1, a1)),
    "gradient-1": format(primary),
    "gradient-2": format(ok(0.74, pc, a1)),
    "gradient-3": format(ok(0.72, pc * 0.85, a2)),
    "aurora-1": format(primary),
    "aurora-2": format(ok(0.74, pc * 0.7, a2)),
    "aurora-3": format(ok(0.72, pc, a1)),
    spotlight: format(ok(0.7, pc * 0.8, s.hue, 0.18)),
    "shimmer-bg": format(bg),
    "skeleton-highlight": format(n(0.37, 1.6)),
    pattern: format(n(0.705, 2, 0.38)),
    ripple: format({ ...primaryText, alpha: 0.55 }),
    particle: format(ok(0.85, pc * 0.25, s.hue)),
    "aurora-veil": format(bg),
    "chart-seq-from": format(ok(0.28, pc * 0.3, s.hue)),
    "chart-seq-to": format(ok(0.85, pc * 0.6, s.hue)),
  } satisfies Partial<ThemeTokens>);
  for (let i = 1; i <= 8; i++) {
    const key = `chart-${i}` as ThemeTokenName;
    t[key] = shift(DEFAULT_DARK[key], delta, chartScale);
  }
  t["chart-1"] = format(ok(0.7, Math.max(pc * 0.75, 0.05), s.hue));
  for (const tone of STATUS) {
    t[`${tone}-text`] = format(ensure(parseOklch(t[`${tone}-text`]) ?? fg, bg, 4.6));
    if (DEFAULT_DARK[`${tone}-foreground`] === DEFAULT_DARK.background) t[`${tone}-foreground`] = format(bg);
  }
  return t;
}

/** WCAG pairs every theme must meet (text 4.5:1, input and ring 3:1). */
export const contrastPairs: readonly { token: ThemeTokenName; against: ThemeTokenName; min: number }[] = [
  { token: "foreground", against: "background", min: 4.5 },
  { token: "foreground", against: "surface", min: 4.5 },
  { token: "muted-foreground", against: "background", min: 4.5 },
  { token: "primary-foreground", against: "primary", min: 4.5 },
  { token: "primary-text", against: "background", min: 4.5 },
  ...STATUS.flatMap((tone) => [
    { token: `${tone}-foreground` as ThemeTokenName, against: tone as ThemeTokenName, min: 4.5 },
    { token: `${tone}-text` as ThemeTokenName, against: "background" as ThemeTokenName, min: 4.5 },
  ]),
  { token: "input", against: "background", min: 3 },
  { token: "ring", against: "background", min: 3 },
];

/** Checks a token map against contrastPairs. Translucent surfaces are composited over the background. */
export function checkContrast(tokens: ThemeTokens, mode: ThemeMode = "light"): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  const bg = parseOklch(tokens.background);
  if (!bg) return warnings;
  const canvas = { ...bg, alpha: 1 };
  for (const pair of contrastPairs) {
    const fg = parseOklch(tokens[pair.token]);
    const back = parseOklch(tokens[pair.against]);
    if (!fg || !back) continue;
    // Both sides as they render over the page background (translucent glass surfaces included).
    const value = ratio(over(fg, canvas), over(back, canvas));
    if (value < pair.min) {
      warnings.push({ mode, token: pair.token, against: pair.against, ratio: round(value, 2), required: pair.min });
    }
  }
  return warnings;
}

function normalizeRadius(radius: string | number): string {
  if (typeof radius === "number") return `${round(radius / 16, 4)}rem`;
  return /^\d*\.?\d+(px|rem|em)$/.test(radius.trim()) ? radius.trim() : "0.625rem";
}

/** Builds light and dark token maps for a preset, optionally re-seeded with a custom hue, chroma, radius or font. */
export function buildTheme(options: ThemeBuildOptions = {}): BuiltTheme {
  const preset = themePresets[options.preset ?? "default"] ?? themePresets.default;
  const customHue = options.hue !== undefined && Number.isFinite(options.hue);
  const customChroma = options.chroma !== undefined && Number.isFinite(options.chroma);
  const hue = customHue ? wrapHue(options.hue ?? 0) : preset.hue;
  const chroma = customChroma ? clamp(options.chroma ?? 0, 0, 0.37) : preset.chroma;
  const delta = hue - preset.hue;
  const seed: Seed = {
    hue,
    chroma,
    neutralHue: preset.neutralChroma === 0 ? hue : wrapHue(preset.neutralHue + delta),
    neutralChroma: preset.neutralChroma === 0 && chroma > 0 ? 0.01 : preset.neutralChroma,
    accents: [wrapHue(preset.accents[0] + delta), wrapHue(preset.accents[1] + delta)],
    onPrimary: preset.onPrimary ?? "light",
    monochrome: preset.monochrome ?? false,
  };
  const untouched = !customHue && !customChroma;
  const exactDefault = preset.name === "default" && untouched;
  const light = exactDefault
    ? { ...DEFAULT_LIGHT }
    : repair({ ...deriveLight(seed), ...(untouched ? preset.light : stripHued(preset.light)) });
  const dark = exactDefault
    ? { ...DEFAULT_DARK }
    : repair({ ...deriveDark(seed), ...(untouched ? preset.dark : stripHued(preset.dark)) });
  const constants: ThemeConstants = {
    radius: normalizeRadius(options.radius ?? preset.radius),
    ...fontConstants(options.font ?? preset.font),
    overlayBlur: preset.overlayBlur ?? "0px",
    surfaceBlur: preset.surfaceBlur ?? "0px",
  };
  return {
    name: sanitizeName(options.name ?? preset.name),
    preset: preset.name,
    light,
    dark,
    constants,
    extra: { ...preset.extra },
    warnings: [...checkContrast(light, "light"), ...checkContrast(dark, "dark")],
  };
}

/** Re-checks the pairs measured on the page background after overrides changed it (e.g. glass). */
function repair(tokens: ThemeTokens): ThemeTokens {
  const bg = parseOklch(tokens.background);
  if (!bg) return tokens;
  for (const pair of contrastPairs) {
    if (pair.against !== "background") continue;
    const color = parseOklch(tokens[pair.token]);
    if (color && contrast(tokens[pair.token], tokens.background) < pair.min) {
      tokens[pair.token] = format(ensure(color, bg, pair.min + 0.1));
    }
  }
  return tokens;
}

/** Keeps translucent surface overrides (glass) but drops hand-tuned tinted colors when the hue changes. */
function stripHued(tokens: Partial<ThemeTokens> | undefined): Partial<ThemeTokens> {
  const out: Partial<ThemeTokens> = {};
  for (const [key, value] of Object.entries(tokens ?? {}) as [ThemeTokenName, string][]) {
    const parsed = parseOklch(value);
    if (parsed && (parsed.alpha < 1 || parsed.c === 0)) out[key] = value;
  }
  return out;
}

function sanitizeName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return clean || "custom";
}

function declarations(tokens: ThemeTokens, indent: string): string {
  return themeTokenNames.map((name) => `${indent}--pui-${name}: ${tokens[name]};`).join("\n");
}

function constantDeclarations(c: ThemeConstants, extra: Record<string, string>, indent: string): string {
  const lines = [
    `--pui-radius: ${c.radius};`,
    `--pui-font-sans: ${c.fontSans};`,
    `--pui-font-display: ${c.fontDisplay};`,
    `--pui-font-mono: ${c.fontMono};`,
    `--pui-overlay-blur: ${c.overlayBlur};`,
    `--pui-surface-blur: ${c.surfaceBlur};`,
    ...Object.entries(extra)
      .filter(([key]) => /^--pui-[a-z0-9-]+$/.test(key))
      .map(([key, value]) => `${key}: ${value.replace(/[;{}<>]/g, "")};`),
  ];
  return lines.map((line) => indent + line).join("\n");
}

/** Light and dark selectors for a preset name (works at the root and on nested islands). */
export function presetSelectors(name: string): { light: string; dark: string } {
  const p = `[data-pui-theme="${sanitizeName(name)}"]`;
  return {
    light: [p, `${p} .light`, `${p} [data-theme="light"]`].join(",\n"),
    dark: [
      `.dark${p}`,
      `[data-theme="dark"]${p}`,
      `${p} .dark`,
      `${p} [data-theme="dark"]`,
      `.dark ${p}`,
      `[data-theme="dark"] ${p}`,
    ].join(",\n"),
  };
}

/** Returns a CSS block (light + dark) for a theme. Paste it after theme.css. */
export function buildThemeCss(options: ThemeBuildOptions = {}): string {
  const theme = buildTheme(options);
  const indent = "  ";
  const header = `/* ChangelUI theme "${theme.name}" (from the ${theme.preset} preset) */`;
  if (options.selector === "root") {
    return [
      header,
      `:root,\n.light,\n[data-theme="light"] {\n${constantDeclarations(theme.constants, theme.extra, indent)}\n\n${declarations(theme.light, indent)}\n}`,
      `.dark,\n[data-theme="dark"] {\n${declarations(theme.dark, indent)}\n}`,
      "",
    ].join("\n\n");
  }
  const sel = presetSelectors(theme.name);
  return [
    header,
    `${sel.light} {\n${constantDeclarations(theme.constants, theme.extra, indent)}\n\n${declarations(theme.light, indent)}\n}`,
    `${sel.dark} {\n${declarations(theme.dark, indent)}\n}`,
    "",
  ].join("\n\n");
}

/** Swatch colors for a preset in a mode: [primary, accent, background]. */
export function presetSwatch(name: ThemePresetName, mode: ThemeMode = "light"): [string, string, string] {
  const theme = buildTheme({ preset: name });
  const tokens = mode === "dark" ? theme.dark : theme.light;
  return [tokens.primary, tokens["gradient-2"], tokens.background];
}
