// Pie layout: values to start/end angles. Angles in radians, 0 = 12 o'clock, clockwise.

export interface PieSlice<T> {
  datum: T;
  /** Position of the datum in the input. */
  index: number;
  /** Position in drawing order (differs from index when sorted). */
  order: number;
  value: number;
  startAngle: number;
  endAngle: number;
  padAngle: number;
}

export type PieSort<T> = "none" | "descending" | "ascending" | ((a: T, b: T) => number);

export interface PieOptions<T> {
  startAngle?: number;
  endAngle?: number;
  /** Gap between slices in radians (capped at span / n). Default 0. */
  padAngle?: number;
  /** Drawing order. Default "none" (input order, the most predictable for legends). */
  sort?: PieSort<T>;
  /** Minimum angle for any slice with a positive value; others shrink to make room. Default 0. */
  minAngle?: number;
}

const TAU = 2 * Math.PI;

/**
 * Lays out slices in input order (the returned array matches `data`). Negative and non-finite
 * values get a zero-width slice. A total of 0 gives every slice zero width at startAngle.
 */
export function pie<T>(data: readonly T[], value: (d: T, i: number) => number, options: PieOptions<T> = {}): PieSlice<T>[] {
  const n = data.length;
  const a0 = options.startAngle ?? 0;
  const span = Math.min(TAU, Math.max(-TAU, (options.endAngle ?? TAU) - a0));
  const pad = n ? Math.min(Math.abs(span) / n, Math.max(0, options.padAngle ?? 0)) : 0;
  const signedPad = pad * (span < 0 ? -1 : 1);
  const raw = data.map((d, i) => +value(d, i));
  const values = raw.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const order = values.map((_, i) => i);
  const sort = options.sort ?? "none";
  if (sort === "descending") order.sort((i, j) => (values[j] as number) - (values[i] as number));
  else if (sort === "ascending") order.sort((i, j) => (values[i] as number) - (values[j] as number));
  else if (typeof sort === "function") order.sort((i, j) => sort(data[i] as T, data[j] as T));

  const available = span - n * signedPad;
  const widths = distribute(values, Math.abs(available), Math.max(0, options.minAngle ?? 0)).map((w) => w * Math.sign(available || 1));

  const out = new Array<PieSlice<T>>(n);
  let angle = a0;
  order.forEach((i, k) => {
    const start = angle;
    angle = angle + (widths[i] as number) + signedPad;
    out[i] = { datum: data[i] as T, index: i, order: k, value: raw[i] as number, startAngle: start, endAngle: angle, padAngle: pad };
  });
  return out;
}

/** Splits `total` proportionally, giving every positive value at least `min` when that fits. */
function distribute(values: readonly number[], total: number, min: number): number[] {
  const sum = values.reduce((a, v) => a + v, 0);
  if (!sum) return values.map(() => 0);
  const k = total / sum;
  const widths = values.map((v) => v * k);
  const positive = values.filter((v) => v > 0).length;
  if (!(min > 0) || min * positive > total) return widths;
  // Pin slices below the minimum, then rescale the rest; repeat until nothing new is pinned.
  const pinned = new Set<number>();
  for (let round = 0; round < values.length; round++) {
    let free = total - pinned.size * min;
    let freeSum = 0;
    values.forEach((v, i) => {
      if (!pinned.has(i)) freeSum += v;
    });
    let changed = false;
    values.forEach((v, i) => {
      if (pinned.has(i) || v <= 0) return;
      if ((v / freeSum) * free < min) {
        pinned.add(i);
        changed = true;
      }
    });
    if (!changed) {
      free = total - pinned.size * min;
      values.forEach((v, i) => {
        widths[i] = pinned.has(i) ? min : v > 0 ? (v / freeSum) * free : 0;
      });
      return widths;
    }
  }
  return widths;
}

/**
 * Merges items whose share of the total is below `threshold` (0..1) into one trailing "other"
 * item, built by `makeOther(sum, merged)`. Returns the input unchanged when fewer than 2 qualify.
 */
export function mergeSmallSlices<T>(
  data: readonly T[],
  value: (d: T) => number,
  threshold: number,
  makeOther: (sum: number, merged: T[]) => T,
): T[] {
  const total = data.reduce((a, d) => a + Math.max(0, value(d) || 0), 0);
  if (!total || !(threshold > 0)) return [...data];
  const small = data.filter((d) => Math.max(0, value(d) || 0) / total < threshold);
  if (small.length < 2) return [...data];
  const keep = data.filter((d) => !small.includes(d));
  return [...keep, makeOther(small.reduce((a, d) => a + Math.max(0, value(d) || 0), 0), small)];
}
