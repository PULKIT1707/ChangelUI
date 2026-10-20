// Palette helpers. They return var() / color-mix() strings for inline styles and SVG attributes,
// never color literals, so every chart follows the active theme, preset and mode.
// The --pui-chart-* tokens live in src/styles/theme.css; the fallbacks cover older theme files.

/** Number of categorical colors in the theme (--pui-chart-1 .. --pui-chart-8). */
export const CATEGORICAL_COUNT = 8;

/** Redundant encodings cycled once series outnumber the palette (WCAG 1.4.1). */
export const CHART_PATTERNS = ["diagonal", "dots", "cross", "vertical", "grid"] as const;
export type ChartPattern = (typeof CHART_PATTERNS)[number] | "none";

/** Fallback when a chart token is missing: the theme's primary color. */
const FALLBACK = "var(--pui-primary)";

/** var(--pui-chart-N) for series index i (0-based), cycling through the palette. */
export function categoricalColor(index: number): string {
  const n = (((Math.floor(index) % CATEGORICAL_COUNT) + CATEGORICAL_COUNT) % CATEGORICAL_COUNT) + 1;
  return `var(--pui-chart-${n}, ${FALLBACK})`;
}

/**
 * Like categoricalColor, but never repeats a color for the first 24 indexes: past the 8 palette
 * tokens each lap mixes the token toward the foreground (a darker shade in light mode, a lighter
 * one in dark mode), then toward the background. Token-only, so it follows every theme.
 */
export function distinctCategoricalColor(index: number): string {
  const i = Math.max(0, Math.floor(index));
  const base = categoricalColor(i);
  const lap = Math.floor(i / CATEGORICAL_COUNT) % 3;
  if (lap === 1) return mix(base, "var(--pui-foreground)", 0.55);
  if (lap === 2) return mix(base, "var(--pui-background)", 0.5);
  return base;
}
/** The pattern for series i once the palette repeats (none for the first 8 series). */
export function seriesPattern(index: number, count: number): ChartPattern {
  if (count <= CATEGORICAL_COUNT || index < CATEGORICAL_COUNT) return "none";
  return CHART_PATTERNS[Math.floor(index / CATEGORICAL_COUNT - 1) % CHART_PATTERNS.length] ?? "none";
}

const pct = (t: number) => `${Math.round(Math.max(0, Math.min(1, t)) * 1000) / 10}%`;

/** Mixes `a` into `b` by t (0 = b, 1 = a) in OKLab, the perceptually even space. */
export function mix(a: string, b: string, t: number): string {
  return `color-mix(in oklab, ${a} ${pct(t)}, ${b})`;
}

/** The color at t (0..1) on the sequential ramp (heatmaps, choropleths). */
export function sequentialColor(t: number): string {
  return mix("var(--pui-chart-seq-to, var(--pui-primary))", "var(--pui-chart-seq-from, var(--pui-muted))", t);
}

/** n evenly spaced steps of the sequential ramp, light to dark. */
export function sequentialColors(n: number): string[] {
  const count = Math.max(1, Math.floor(n));
  return Array.from({ length: count }, (_, k) => sequentialColor(count === 1 ? 1 : k / (count - 1)));
}

/**
 * Diverging color for `value`: negative side, a neutral midpoint and the positive side, scaled by
 * the larger of |min - mid| and |max - mid| so equal distances get equal intensity.
 */
export function divergingColor(value: number, min: number, max: number, midpoint = 0): string {
  const span = Math.max(Math.abs(min - midpoint), Math.abs(max - midpoint)) || 1;
  const t = Math.max(-1, Math.min(1, (value - midpoint) / span));
  const mid = "var(--pui-chart-div-mid, var(--pui-muted))";
  return t < 0 ? mix("var(--pui-chart-div-neg, var(--pui-danger))", mid, -t) : mix("var(--pui-chart-div-pos, var(--pui-primary))", mid, t);
}

/** `color` at the given opacity (0..1), as a mix with transparent. */
export function withOpacity(color: string, opacity: number): string {
  return mix(color, "transparent", opacity);
}

/** Finance up/down colors (the colorblind option swaps to the blue/amber pair). */
export function trendColor(direction: "up" | "down", colorblind = false): string {
  if (colorblind) return direction === "up" ? categoricalColor(5) : categoricalColor(2);
  return direction === "up" ? "var(--pui-chart-up, var(--pui-success))" : "var(--pui-chart-down, var(--pui-danger))";
}
