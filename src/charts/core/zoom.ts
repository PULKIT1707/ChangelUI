// Zoom and pan math over a data domain (chart-zoom). Pure: the React layer turns wheel, pinch,
// drag and keys into these calls and stores the result as the chart's xDomain.

export type Span = readonly [number, number];

export interface ZoomLimits {
  /** Full data extent; the window never leaves it. */
  extent?: Span;
  /** Smallest allowed window width (e.g. 2 data steps). */
  minSpan?: number;
}

/** Wheel delta to a zoom factor (>1 zooms in). Line and page deltas are normalized to pixels. */
export function wheelZoomFactor(deltaY: number, deltaMode = 0): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 800 : deltaY;
  return Math.exp(-px * 0.002);
}

/** Keeps a window inside the extent and at least minSpan wide (and no wider than the extent). */
export function clampDomain(domain: Span, limits: ZoomLimits = {}): [number, number] {
  let [a, b] = domain[0] <= domain[1] ? domain : [domain[1], domain[0]];
  const ext = limits.extent ? ([Math.min(...limits.extent), Math.max(...limits.extent)] as const) : null;
  const full = ext ? ext[1] - ext[0] : Infinity;
  const min = Math.min(limits.minSpan ?? 0, full);
  if (b - a < min) {
    const mid = (a + b) / 2;
    a = mid - min / 2;
    b = mid + min / 2;
  }
  if (ext) {
    if (b - a > full) [a, b] = [ext[0], ext[1]];
    if (a < ext[0]) [a, b] = [ext[0], ext[0] + (b - a)];
    if (b > ext[1]) [a, b] = [ext[1] - (b - a), ext[1]];
  }
  return [a, b];
}

/** Scales the window by 1/factor around `anchor` (the pointer's data value), which stays put. */
export function zoomAround(domain: Span, factor: number, anchor: number, limits: ZoomLimits = {}): [number, number] {
  const f = factor > 0 && Number.isFinite(factor) ? factor : 1;
  const [a, b] = domain;
  return clampDomain([anchor - (anchor - a) / f, anchor + (b - anchor) / f], limits);
}

/** Shifts the window by `delta` data units, clamped to the extent. */
export function panBy(domain: Span, delta: number, limits: ZoomLimits = {}): [number, number] {
  return clampDomain([domain[0] + delta, domain[1] + delta], limits);
}

/** Keyboard zoom (+ / -) around the focused value or the window center. */
export function keyboardZoom(domain: Span, direction: "in" | "out", anchor = (domain[0] + domain[1]) / 2, limits: ZoomLimits = {}): [number, number] {
  return zoomAround(domain, direction === "in" ? 1.25 : 0.8, anchor, limits);
}

/** Shift+arrow pan: a tenth of the window per press. */
export function keyboardPan(domain: Span, direction: -1 | 1, limits: ZoomLimits = {}): [number, number] {
  return panBy(domain, ((domain[1] - domain[0]) / 10) * direction, limits);
}

/** Two-pointer pinch: the zoom factor from the change in pointer distance. */
export function pinchFactor(startDistance: number, distance: number): number {
  return startDistance > 0 && distance > 0 ? distance / startDistance : 1;
}

/**
 * Rubber-band resistance for overscroll: the further past the edge, the less it moves, never
 * exceeding `limit` px (40 by default, then it springs back on release).
 */
export function rubberBand(overscroll: number, limit = 40): number {
  if (!overscroll) return 0;
  const sign = Math.sign(overscroll);
  const x = Math.abs(overscroll);
  return sign * limit * (1 - 1 / ((x * 0.55) / limit + 1));
}

/** A brushed pixel range to a sorted data window. */
export function brushDomain(px0: number, px1: number, invert: (px: number) => number): [number, number] {
  const a = invert(Math.min(px0, px1));
  const b = invert(Math.max(px0, px1));
  return a <= b ? [a, b] : [b, a];
}

/** True when the window is narrower than the extent (zoomed in). */
export function isZoomed(domain: Span | null, extent: Span): boolean {
  if (!domain) return false;
  const lo = Math.min(...extent);
  const hi = Math.max(...extent);
  return domain[0] > lo || domain[1] < hi;
}
