// Downsampling for big series. Both return indices into the original arrays (ascending), so hover
// can still snap to raw data while the path draws far fewer points.

/**
 * Largest-Triangle-Three-Buckets (Steinarsson 2013): keeps the first and last points and, per
 * bucket, the point forming the largest triangle with its neighbors. Preserves visual shape.
 */
export function lttb(xs: ArrayLike<number>, ys: ArrayLike<number>, threshold: number): number[] {
  const n = Math.min(xs.length, ys.length);
  const target = Math.floor(threshold);
  if (target >= n || target < 3) return Array.from({ length: n }, (_, i) => i);
  const out = [0];
  const every = (n - 2) / (target - 2);
  let a = 0;
  for (let i = 0; i < target - 2; i++) {
    // Average of the next bucket: the third triangle vertex.
    const s = Math.floor((i + 1) * every) + 1;
    const e = Math.min(n, Math.floor((i + 2) * every) + 1);
    let avgX = 0;
    let avgY = 0;
    for (let j = s; j < e; j++) {
      avgX += xs[j] as number;
      avgY += ys[j] as number;
    }
    const len = e - s || 1;
    avgX /= len;
    avgY /= len;
    const rs = Math.floor(i * every) + 1;
    const re = Math.floor((i + 1) * every) + 1;
    const ax = xs[a] as number;
    const ay = ys[a] as number;
    let best = -1;
    let pick = rs;
    for (let j = rs; j < re; j++) {
      const area = Math.abs((ax - avgX) * ((ys[j] as number) - ay) - (ax - (xs[j] as number)) * (avgY - ay));
      if (area > best) {
        best = area;
        pick = j;
      }
    }
    out.push(pick);
    a = pick;
  }
  out.push(n - 1);
  return out;
}

/**
 * Min/max per pixel column: for every pixel bucket of x keeps the first, min, max and last point.
 * Exact envelope (no spike is ever lost), at most 4 points per pixel. `x0`/`x1` map to `pixels`.
 */
export function minMaxPerPixel(xs: ArrayLike<number>, ys: ArrayLike<number>, pixels: number, x0?: number, x1?: number): number[] {
  const n = Math.min(xs.length, ys.length);
  if (n <= 2 || !(pixels > 0)) return Array.from({ length: n }, (_, i) => i);
  const lo = x0 ?? xs[0] ?? 0;
  const hi = x1 ?? xs[n - 1] ?? 0;
  const k = hi > lo ? pixels / (hi - lo) : 0;
  const out: number[] = [];
  let bucket = Number.NaN;
  let first = 0;
  let last = 0;
  let iMin = 0;
  let iMax = 0;
  const flush = () => {
    const picks = [...new Set([first, iMin, iMax, last])].sort((a, b) => a - b);
    for (const p of picks) out.push(p);
  };
  for (let i = 0; i < n; i++) {
    const y = ys[i] as number;
    const b = Math.floor(((xs[i] as number) - lo) * k);
    if (b !== bucket) {
      if (i > 0) flush();
      bucket = b;
      first = last = iMin = iMax = i;
      continue;
    }
    last = i;
    if (Number.isFinite(y)) {
      if (!Number.isFinite(ys[iMin]) || y < (ys[iMin] as number)) iMin = i;
      if (!Number.isFinite(ys[iMax]) || y > (ys[iMax] as number)) iMax = i;
    }
  }
  flush();
  return out;
}

export type DecimateMode = "auto" | "lttb" | "minmax" | false;

/**
 * Picks a strategy: below `2 * pixels` points nothing is dropped; "auto" uses LTTB to about two
 * points per pixel (lines), "minmax" keeps the exact envelope (streams, oscilloscopes).
 */
export function decimate(xs: ArrayLike<number>, ys: ArrayLike<number>, pixels: number, mode: DecimateMode = "auto"): number[] {
  const n = Math.min(xs.length, ys.length);
  const budget = Math.max(3, Math.round(2 * pixels));
  if (mode === false || n <= budget) return Array.from({ length: n }, (_, i) => i);
  return mode === "minmax" ? minMaxPerPixel(xs, ys, pixels) : lttb(xs, ys, budget);
}
