// Statistics for charts: summaries, robust spread, regression, moving averages, finance bands,
// histogram binning and kernel density. Non-finite values (null, NaN) are ignored unless noted.
import { nice, tickIncrement, ticks } from "./ticks";

type Num = number | null | undefined;

/** Finite values only. */
export function finite(values: Iterable<Num>): number[] {
  const out: number[] = [];
  for (const v of values) if (v !== null && v !== undefined && Number.isFinite(v)) out.push(v);
  return out;
}

/** [min, max] of the finite values, or undefined when there are none. */
export function extent(values: Iterable<Num>): [number, number] | undefined {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo <= hi ? [lo, hi] : undefined;
}

export function sum(values: Iterable<Num>): number {
  let s = 0;
  for (const v of finite(values)) s += v;
  return s;
}

export function mean(values: Iterable<Num>): number | undefined {
  const xs = finite(values);
  return xs.length ? sum(xs) / xs.length : undefined;
}

/** Sample variance (n - 1 denominator, Welford's method); undefined for fewer than 2 values. */
export function variance(values: Iterable<Num>): number | undefined {
  let n = 0;
  let m = 0;
  let s = 0;
  for (const v of finite(values)) {
    n++;
    const d = v - m;
    m += d / n;
    s += d * (v - m);
  }
  return n > 1 ? s / (n - 1) : undefined;
}

/** Sample standard deviation. */
export function deviation(values: Iterable<Num>): number | undefined {
  const v = variance(values);
  return v === undefined ? undefined : Math.sqrt(v);
}

/** Quantile of already sorted finite values, linear interpolation between ranks (R type 7). */
export function quantileSorted(sorted: readonly number[], p: number): number | undefined {
  const n = sorted.length;
  if (!n || !Number.isFinite(p)) return undefined;
  if (p <= 0 || n < 2) return sorted[0];
  if (p >= 1) return sorted[n - 1];
  const h = (n - 1) * p;
  const i = Math.floor(h);
  const a = sorted[i] as number;
  const b = sorted[i + 1] as number;
  return a + (b - a) * (h - i);
}

/** p-quantile (0..1) of the finite values (R type 7, the spreadsheet/numpy default). */
export function quantile(values: Iterable<Num>, p: number): number | undefined {
  return quantileSorted(
    finite(values).sort((a, b) => a - b),
    p,
  );
}

export function median(values: Iterable<Num>): number | undefined {
  return quantile(values, 0.5);
}

/** Five-number summary plus Tukey fences (box plots). */
export interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  /** Most extreme values within 1.5 IQR of the box. */
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
}

export function boxStats(values: Iterable<Num>, whisker = 1.5): BoxStats | undefined {
  const xs = finite(values).sort((a, b) => a - b);
  if (!xs.length) return undefined;
  const q1 = quantileSorted(xs, 0.25) as number;
  const q3 = quantileSorted(xs, 0.75) as number;
  const iqr = q3 - q1;
  const lo = q1 - whisker * iqr;
  const hi = q3 + whisker * iqr;
  const inside = xs.filter((v) => v >= lo && v <= hi);
  return {
    min: xs[0] as number,
    q1,
    median: quantileSorted(xs, 0.5) as number,
    q3,
    max: xs[xs.length - 1] as number,
    lowerWhisker: inside[0] ?? q1,
    upperWhisker: inside[inside.length - 1] ?? q3,
    outliers: xs.filter((v) => v < lo || v > hi),
  };
}

/** Median absolute deviation (unscaled). Multiply by 1.4826 for a normal-consistent sigma. */
export function mad(values: Iterable<Num>): number | undefined {
  const xs = finite(values);
  const m = median(xs);
  return m === undefined ? undefined : median(xs.map((v) => Math.abs(v - m)));
}

export interface Regression {
  slope: number;
  intercept: number;
  /** Coefficient of determination, 0..1 (NaN when y is constant). */
  r2: number;
  predict(x: number): number;
}

/** Ordinary least squares y = slope * x + intercept over pairs with finite x and y. */
export function linearRegression(xs: readonly Num[], ys: readonly Num[]): Regression | undefined {
  let n = 0;
  let mx = 0;
  let my = 0;
  const n0 = Math.min(xs.length, ys.length);
  for (let i = 0; i < n0; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === null || x === undefined || y === null || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    n++;
    mx += (x - mx) / n;
    my += (y - my) / n;
  }
  if (n < 2) return undefined;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n0; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === null || x === undefined || y === null || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    sxx += (x - mx) * (x - mx);
    sxy += (x - mx) * (y - my);
    syy += (y - my) * (y - my);
  }
  if (!sxx) return undefined;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy ? (sxy * sxy) / (sxx * syy) : Number.NaN;
  return { slope, intercept, r2, predict: (x) => slope * x + intercept };
}

/**
 * Simple moving average over a trailing window. Output has the input length; the first
 * window - 1 entries (and any window containing a non-finite value) are NaN.
 */
export function sma(values: readonly Num[], window: number): number[] {
  const w = Math.max(1, Math.floor(window));
  const out = new Array<number>(values.length).fill(Number.NaN);
  let s = 0;
  let bad = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v)) bad++;
    else s += v;
    if (i >= w) {
      const old = values[i - w];
      if (old === null || old === undefined || !Number.isFinite(old)) bad--;
      else s -= old;
    }
    if (i >= w - 1 && !bad) out[i] = s / w;
  }
  return out;
}

/**
 * Exponential moving average with alpha = 2 / (period + 1), seeded with the SMA of the first
 * `period` values (the usual charting convention). Earlier entries are NaN; gaps carry the EMA.
 */
export function ema(values: readonly Num[], period: number): number[] {
  const p = Math.max(1, Math.floor(period));
  const alpha = 2 / (p + 1);
  const out = new Array<number>(values.length).fill(Number.NaN);
  let seed = 0;
  let count = 0;
  let prev = Number.NaN;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const ok = v !== null && v !== undefined && Number.isFinite(v);
    if (Number.isNaN(prev)) {
      if (!ok) continue;
      seed += v;
      count++;
      if (count === p) {
        prev = seed / p;
        out[i] = prev;
      }
      continue;
    }
    if (ok) prev = alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

export interface BollingerBands {
  middle: number[];
  upper: number[];
  lower: number[];
}

/** Bollinger bands: SMA(period) +/- k population standard deviations of the same window. */
export function bollinger(values: readonly Num[], period = 20, k = 2): BollingerBands {
  const middle = sma(values, period);
  const w = Math.max(1, Math.floor(period));
  const upper = new Array<number>(values.length).fill(Number.NaN);
  const lower = new Array<number>(values.length).fill(Number.NaN);
  for (let i = w - 1; i < values.length; i++) {
    const m = middle[i] as number;
    if (Number.isNaN(m)) continue;
    let ss = 0;
    for (let j = i - w + 1; j <= i; j++) ss += ((values[j] as number) - m) ** 2;
    const sd = Math.sqrt(ss / w);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
  }
  return { middle, upper, lower };
}

// ---------------------------------------------------------------------------------------------
// Binning

/** Sturges' rule: ceil(log2 n) + 1 bins. */
export function thresholdSturges(values: Iterable<Num>): number {
  const n = finite(values).length;
  return n ? Math.max(1, Math.ceil(Math.log2(n)) + 1) : 1;
}

/** Freedman-Diaconis: bin width 2 * IQR * n^(-1/3); returns the bin count over [min, max]. */
export function thresholdFreedmanDiaconis(values: Iterable<Num>, min: number, max: number): number {
  const xs = finite(values);
  const iqr = (quantile(xs, 0.75) ?? 0) - (quantile(xs, 0.25) ?? 0);
  return xs.length && iqr ? Math.ceil((max - min) / (2 * iqr * xs.length ** (-1 / 3))) : 1;
}

export interface Bin {
  /** Inclusive lower edge. */
  x0: number;
  /** Exclusive upper edge (inclusive for the last bin). */
  x1: number;
  count: number;
  values: number[];
}

export interface BinOptions {
  /** Explicit edges, or a target bin count. Default: Freedman-Diaconis, Sturges when the IQR is 0. */
  thresholds?: number | readonly number[];
  /** Range to bin over. Default: the data extent, extended to round edges. */
  domain?: readonly [number, number];
}

/**
 * Histogram bins with round edges: a bin count becomes tick-aligned edges over the nice extent, so
 * labels read 0, 10, 20 instead of 0, 9.73, 19.46. Every finite value inside the domain lands in
 * exactly one bin.
 */
export function bin(values: Iterable<Num>, options: BinOptions = {}): Bin[] {
  const xs = finite(values);
  const ext = options.domain ? ([Math.min(...options.domain), Math.max(...options.domain)] as [number, number]) : extent(xs);
  if (!ext) return [];
  let [lo, hi] = ext;
  let edges: number[];
  if (Array.isArray(options.thresholds)) {
    edges = [...new Set([lo, ...(options.thresholds as readonly number[]).filter((t) => t > lo && t < hi), hi])].sort((a, b) => a - b);
  } else {
    const count =
      typeof options.thresholds === "number"
        ? Math.max(1, Math.floor(options.thresholds))
        : (() => {
            const fd = thresholdFreedmanDiaconis(xs, lo, hi);
            return fd > 1 || lo === hi ? fd : thresholdSturges(xs);
          })();
    if (lo === hi) {
      edges = [lo, hi];
    } else {
      if (!options.domain) [lo, hi] = nice(lo, hi, count);
      edges = Number.isFinite(tickIncrement(lo, hi, count)) ? ticks(lo, hi, count) : [];
      if (edges.length < 2) edges = [lo, hi];
      // ticks() can stop short of an explicit domain's ends; keep the whole domain covered.
      if ((edges[0] as number) > lo) edges.unshift(lo);
      if ((edges[edges.length - 1] as number) < hi) edges.push(hi);
    }
  }
  const bins: Bin[] = [];
  for (let i = 0; i < Math.max(1, edges.length - 1); i++) {
    bins.push({ x0: edges[i] as number, x1: (edges[i + 1] ?? edges[i]) as number, count: 0, values: [] });
  }
  const last = bins.length - 1;
  for (const v of xs) {
    if (v < lo || v > hi) continue;
    // Binary search for the bin whose [x0, x1) contains v; the top edge belongs to the last bin.
    let a = 0;
    let b = last;
    while (a < b) {
      const mid = (a + b + 1) >>> 1;
      if ((bins[mid] as Bin).x0 <= v) a = mid;
      else b = mid - 1;
    }
    const target = bins[a] as Bin;
    target.count++;
    target.values.push(v);
  }
  return bins;
}

/** Silverman's rule-of-thumb bandwidth: 0.9 * min(sd, IQR / 1.34) * n^(-1/5). */
export function silvermanBandwidth(values: Iterable<Num>): number {
  const xs = finite(values);
  const sd = deviation(xs) ?? 0;
  const iqr = (quantile(xs, 0.75) ?? 0) - (quantile(xs, 0.25) ?? 0);
  const spread = Math.min(sd, iqr / 1.34) || sd || Math.abs(xs[0] ?? 1) || 1;
  return 0.9 * spread * Math.max(1, xs.length) ** -0.2;
}

export interface KdeOptions {
  bandwidth?: number;
  /** Sample count along x. Default 64. */
  samples?: number;
  /** x range to sample. Default: extent padded by 3 bandwidths. */
  domain?: readonly [number, number];
}

/** Gaussian kernel density estimate as [x, density] pairs (density integrates to about 1). */
export function kde(values: Iterable<Num>, options: KdeOptions = {}): Array<[number, number]> {
  const xs = finite(values);
  if (!xs.length) return [];
  const h = options.bandwidth ?? silvermanBandwidth(xs);
  const samples = Math.max(2, Math.floor(options.samples ?? 64));
  const [e0, e1] = extent(xs) as [number, number];
  const [d0, d1] = options.domain ?? [e0 - 3 * h, e1 + 3 * h];
  const norm = 1 / (xs.length * h * Math.sqrt(2 * Math.PI));
  const out: Array<[number, number]> = [];
  for (let k = 0; k < samples; k++) {
    const x = d0 + ((d1 - d0) * k) / (samples - 1);
    let s = 0;
    for (const v of xs) {
      const u = (x - v) / h;
      s += Math.exp(-0.5 * u * u);
    }
    out.push([x, s * norm]);
  }
  return out;
}
