// Beeswarm placement (original): circles keep their x and get the smallest |y| offset that clears
// every circle already placed nearby. Deterministic and simulation-free; O(n * k) for k neighbors.

export type DodgeSide = "both" | "positive" | "negative";

export interface DodgeOptions {
  /** Circle radius in px, or one radius per value. Default 4. */
  radius?: number | readonly number[];
  /** Extra space between circles in px. Default 1. */
  padding?: number;
  /** Grow both ways from the axis (default), or only up (positive) or down (negative). */
  side?: DodgeSide;
}

/**
 * Returns a y offset per input x (same order), measured from the axis: positive is "up" in data
 * terms (subtract from the pixel baseline when drawing). Circles never overlap.
 */
export function dodge(xs: readonly number[], options: DodgeOptions = {}): number[] {
  const n = xs.length;
  const radii = typeof options.radius === "object" ? options.radius : null;
  const fixed = typeof options.radius === "number" ? options.radius : 4;
  const rOf = (i: number) => (radii ? (radii[i] ?? fixed) : fixed);
  const maxR = radii ? Math.max(fixed, ...radii) : fixed;
  const pad = Math.max(0, options.padding ?? 1);
  const side = options.side ?? "both";

  const order = xs.map((_, i) => i).sort((a, b) => (xs[a] as number) - (xs[b] as number) || a - b);
  const ys = new Array<number>(n).fill(0);
  // Placed circles in x order; `lo` skips those too far left to touch anything later.
  const placed: number[] = [];
  let lo = 0;

  for (const i of order) {
    const xi = xs[i] as number;
    const ri = rOf(i);
    const reach = ri + maxR + pad;
    while (lo < placed.length && (xs[placed[lo] as number] as number) < xi - reach) lo++;
    // Each nearby circle forbids an open y interval; merge them and take the free y nearest 0.
    const blocked: Array<[number, number]> = [];
    for (let k = lo; k < placed.length; k++) {
      const j = placed[k] as number;
      const min = ri + rOf(j) + pad;
      const dx = xi - (xs[j] as number);
      if (Math.abs(dx) >= min) continue;
      const dy = Math.sqrt(min * min - dx * dx);
      blocked.push([(ys[j] as number) - dy, (ys[j] as number) + dy]);
    }
    blocked.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const span of blocked) {
      const last = merged[merged.length - 1];
      // Strict: a circle may touch two neighbors at once, so a shared edge stays free.
      if (last && span[0] < last[1]) last[1] = Math.max(last[1], span[1]);
      else merged.push([span[0], span[1]]);
    }
    const ok = (y: number) => (side === "positive" ? y >= 0 : side === "negative" ? y <= 0 : true);
    let chosen = Number.NaN;
    if (!merged.some(([a, b]) => a < 0 && 0 < b)) chosen = 0;
    else {
      for (const [a, b] of merged) {
        for (const y of [a, b]) {
          if (!ok(y)) continue;
          // nearest to the axis wins; on a tie, prefer the positive side
          if (Number.isNaN(chosen) || Math.abs(y) < Math.abs(chosen) || (Math.abs(y) === Math.abs(chosen) && y > chosen)) chosen = y;
        }
      }
    }
    ys[i] = Number.isNaN(chosen) ? 0 : chosen;
    placed.push(i);
  }
  return ys;
}
