// Stacked layouts: per series and point, the [lower, upper] edges. Offsets cover stacked bars and
// areas (none), 100% stacks (expand), positive/negative bars (diverging) and streamgraphs
// (silhouette, wiggle). Orders choose which series sits closest to the baseline.

export type StackOffset = "none" | "expand" | "diverging" | "silhouette" | "wiggle";
export type StackOrder = "none" | "reverse" | "ascending" | "descending" | "appearance" | "insideOut";

export interface StackOptions {
  offset?: StackOffset;
  order?: StackOrder | readonly number[];
}

/** [lower, upper] for one point of one series. */
export type StackBand = [number, number];

export interface StackResult {
  /** bands[series][point]; series stay in input order. */
  bands: StackBand[][];
  /** Series indices from the baseline outwards. */
  order: number[];
}

/** Values: values[series][point]. null/undefined count as 0; NaN propagates as a gap. */
export type StackValues = ReadonlyArray<ReadonlyArray<number | null | undefined>>;

const val = (v: number | null | undefined) => (v === null || v === undefined ? 0 : +v);

function seriesSum(values: ReadonlyArray<number | null | undefined>): number {
  let s = 0;
  for (const v of values) {
    const x = val(v);
    if (x) s += x;
  }
  return s;
}

/** Index of the point where a series peaks (first maximum). */
function peakIndex(values: ReadonlyArray<number | null | undefined>): number {
  let best = -Infinity;
  let at = 0;
  values.forEach((v, i) => {
    const x = val(v);
    if (x > best) {
      best = x;
      at = i;
    }
  });
  return at;
}

/** The stacking order for `values` (series indices, baseline first). */
export function stackOrder(values: StackValues, order: StackOrder = "none"): number[] {
  const idx = values.map((_, i) => i);
  switch (order) {
    case "none":
      return idx;
    case "reverse":
      return idx.reverse();
    case "ascending": {
      const sums = values.map(seriesSum);
      return idx.sort((a, b) => (sums[a] as number) - (sums[b] as number));
    }
    case "descending":
      // The exact reverse of ascending (ties flip too), so toggling the two mirrors the stack.
      return stackOrder(values, "ascending").reverse();
    case "appearance": {
      const peaks = values.map(peakIndex);
      return idx.sort((a, b) => (peaks[a] as number) - (peaks[b] as number));
    }
    case "insideOut": {
      // Earliest-peaking series in the middle, later ones alternating outwards: balanced streams.
      const sums = values.map(seriesSum);
      let top = 0;
      let bottom = 0;
      const tops: number[] = [];
      const bottoms: number[] = [];
      for (const j of stackOrder(values, "appearance")) {
        if (top < bottom) {
          top += sums[j] as number;
          tops.push(j);
        } else {
          bottom += sums[j] as number;
          bottoms.push(j);
        }
      }
      return bottoms.reverse().concat(tops);
    }
  }
}

/** Stacks each upper edge onto the previous series' upper edge (falling back to its lower edge on NaN). */
function offsetNone(bands: StackBand[][], order: readonly number[]): void {
  for (let k = 1; k < order.length; k++) {
    const below = bands[order[k - 1] as number] as StackBand[];
    const cur = bands[order[k] as number] as StackBand[];
    for (let j = 0; j < cur.length; j++) {
      const b = below[j] as StackBand;
      const c = cur[j] as StackBand;
      c[0] = Number.isNaN(b[1]) ? b[0] : b[1];
      c[1] += c[0];
    }
  }
}

/** Stacks series; see StackOffset. Output bands are in input series order. */
export function stack(values: StackValues, options: StackOptions = {}): StackResult {
  const offset = options.offset ?? "none";
  const order = Array.isArray(options.order) ? [...(options.order as readonly number[])] : stackOrder(values, (options.order ?? "none") as StackOrder);
  const m = values.length;
  const n = values.reduce((a, s) => Math.max(a, s.length), 0);
  const bands: StackBand[][] = values.map((s) => Array.from({ length: n }, (_, j): StackBand => [0, val(s[j])]));
  if (m === 0 || n === 0) return { bands, order };

  switch (offset) {
    case "expand": {
      for (let j = 0; j < n; j++) {
        let total = 0;
        for (let i = 0; i < m; i++) total += (bands[i]?.[j] as StackBand)[1] || 0;
        if (total) for (let i = 0; i < m; i++) (bands[i]?.[j] as StackBand)[1] /= total;
      }
      offsetNone(bands, order);
      break;
    }
    case "diverging": {
      // Positive values stack up from 0, negative values stack down; zeros sit at [0, 0].
      for (let j = 0; j < n; j++) {
        let up = 0;
        let down = 0;
        for (const i of order) {
          const b = bands[i]?.[j] as StackBand;
          const dy = b[1] - b[0];
          if (dy > 0) {
            b[0] = up;
            up += dy;
            b[1] = up;
          } else if (dy < 0) {
            b[1] = down;
            down += dy;
            b[0] = down;
          } else {
            b[0] = 0;
            b[1] = dy;
          }
        }
      }
      break;
    }
    case "silhouette": {
      // Centers the stack on y = 0.
      const first = bands[order[0] as number] as StackBand[];
      for (let j = 0; j < n; j++) {
        let total = 0;
        for (let i = 0; i < m; i++) total += (bands[i]?.[j] as StackBand)[1] || 0;
        const b = first[j] as StackBand;
        b[0] = -total / 2;
        b[1] += b[0];
      }
      offsetNone(bands, order);
      break;
    }
    case "wiggle": {
      // Streamgraph baseline (Byron & Wattenberg 2008): minimizes the weighted change in slope.
      const first = bands[order[0] as number] as StackBand[];
      let y = 0;
      for (let j = 1; j < n; j++) {
        let s1 = 0;
        let s2 = 0;
        for (let k = 0; k < order.length; k++) {
          const si = bands[order[k] as number] as StackBand[];
          const cur = (si[j] as StackBand)[1] || 0;
          const prev = (si[j - 1] as StackBand)[1] || 0;
          let s3 = (cur - prev) / 2;
          for (let q = 0; q < k; q++) {
            const sk = bands[order[q] as number] as StackBand[];
            s3 += ((sk[j] as StackBand)[1] || 0) - ((sk[j - 1] as StackBand)[1] || 0);
          }
          s1 += cur;
          s2 += s3 * cur;
        }
        const b = first[j - 1] as StackBand;
        b[0] = y;
        b[1] += y;
        if (s1) y -= s2 / s1;
      }
      const last = first[n - 1] as StackBand;
      last[0] = y;
      last[1] += y;
      offsetNone(bands, order);
      break;
    }
    default:
      offsetNone(bands, order);
  }
  return { bands, order };
}

/** Per-point totals of the stacked values (absolute for diverging). */
export function stackTotals(values: StackValues, absolute = false): number[] {
  const n = values.reduce((a, s) => Math.max(a, s.length), 0);
  return Array.from({ length: n }, (_, j) => values.reduce((a, s) => a + (absolute ? Math.abs(val(s[j])) : val(s[j])), 0));
}
