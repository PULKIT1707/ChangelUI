// Scales: map data values to pixels and back. Pure, immutable (nice/copy return new scales).
// Continuous scales accept numbers or Dates (Dates map by epoch ms) and invert to numbers.
import { logPair, logTicks, nice as niceLinear, niceTime, ticks as linearTicks, timeTicks, type TimeOptions } from "./ticks";

export type ContinuousKind = "linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "utc";
export type Domain = readonly [number, number];
export type Range = readonly [number, number];

export interface ContinuousScale {
  (value: number | Date): number;
  readonly kind: ContinuousKind;
  readonly domain: Domain;
  readonly range: Range;
  readonly clamped: boolean;
  /** Pixel back to a data value (epoch ms for time scales). */
  invert(px: number): number;
  /** About `count` round ticks inside the domain (default 10). */
  ticks(count?: number): number[];
  /** A copy whose domain is extended to round values. */
  nice(count?: number): ContinuousScale;
  copy(changes?: { domain?: Domain; range?: Range; clamp?: boolean }): ContinuousScale;
}

export interface ContinuousOptions {
  /** Clamp outputs to the range (and inverted values to the domain). Default false. */
  clamp?: boolean;
  /** Round the domain to nice values for about this many ticks (`true` = 10). */
  nice?: boolean | number;
}

interface Transform {
  forward: (x: number) => number;
  backward: (x: number) => number;
  ticks: (d0: number, d1: number, count: number) => number[];
  nice: (d0: number, d1: number, count: number) => [number, number];
}

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
const identity = (x: number) => x;

function build(kind: ContinuousKind, domain: Domain, range: Range, clamp: boolean, tf: Transform, rebuild: Rebuild): ContinuousScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const t0 = tf.forward(d0);
  const t1 = tf.forward(d1);
  const span = t1 - t0;
  const rspan = r1 - r0;
  const lo = Math.min(d0, d1);
  const hi = Math.max(d0, d1);

  const scale = ((value: number | Date) => {
    const x = +value;
    // A zero-span domain maps to the middle of the range.
    let t = span ? (tf.forward(x) - t0) / span : Number.isNaN(span) ? Number.NaN : 0.5;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return lerp(r0, r1, t);
  }) as ContinuousScale;

  return Object.assign(scale, {
    kind,
    domain,
    range,
    clamped: clamp,
    invert(px: number) {
      const t = rspan ? (px - r0) / rspan : Number.isNaN(rspan) ? Number.NaN : 0.5;
      const x = tf.backward(lerp(t0, t1, t));
      return clamp ? Math.max(lo, Math.min(hi, x)) : x;
    },
    ticks: (count = 10) => tf.ticks(d0, d1, count),
    nice: (count = 10) => rebuild(tf.nice(d0, d1, count), range, clamp),
    copy: (changes: { domain?: Domain; range?: Range; clamp?: boolean } = {}) =>
      rebuild(changes.domain ?? domain, changes.range ?? range, changes.clamp ?? clamp),
  });
}

type Rebuild = (domain: Domain, range: Range, clamp: boolean) => ContinuousScale;

function factory(kind: ContinuousKind, tf: Transform) {
  const make: Rebuild = (domain, range, clamp) => build(kind, domain, range, clamp, tf, make);
  return (domain: Domain, range: Range, options: ContinuousOptions = {}) => {
    const s = make(domain, range, options.clamp ?? false);
    return options.nice ? s.nice(options.nice === true ? 10 : options.nice) : s;
  };
}

const LINEAR: Transform = { forward: identity, backward: identity, ticks: linearTicks, nice: niceLinear };

/** y = r0 + (x - d0) / (d1 - d0) * (r1 - r0). */
export const scaleLinear = /* @__PURE__ */ factory("linear", LINEAR);

/** Power scale x^exponent (sign-preserving for negative inputs). Ticks are linear in the data. */
export function scalePow(domain: Domain, range: Range, options: ContinuousOptions & { exponent?: number } = {}): ContinuousScale {
  const k = options.exponent ?? 1;
  const forward =
    k === 1 ? identity : k === 0.5 ? (x: number) => (x < 0 ? -Math.sqrt(-x) : Math.sqrt(x)) : (x: number) => (x < 0 ? -((-x) ** k) : x ** k);
  const backward = k === 1 ? identity : k === 0.5 ? (x: number) => (x < 0 ? -x * x : x * x) : (x: number) => (x < 0 ? -((-x) ** (1 / k)) : x ** (1 / k));
  return factory(k === 0.5 ? "sqrt" : "pow", { ...LINEAR, forward, backward })(domain, range, options);
}

/** Square-root scale (area encodings: bubble radius). */
export function scaleSqrt(domain: Domain, range: Range, options: ContinuousOptions = {}): ContinuousScale {
  return scalePow(domain, range, { ...options, exponent: 0.5 });
}

/**
 * Log scale. The domain must not include or cross 0 (all positive or all negative). Ticks are
 * 1..9 per decade for short domains; `nice` rounds to whole powers of the base.
 */
export function scaleLog(domain: Domain, range: Range, options: ContinuousOptions & { base?: number } = {}): ContinuousScale {
  const base = options.base ?? 10;
  const negative = domain[0] < 0;
  const { log, pow } = logPair(base, negative);
  // Positions use the natural log (the base only changes ticks and nice), mirrored for negatives.
  return factory("log", {
    forward: negative ? (x) => -Math.log(-x) : Math.log,
    backward: negative ? (x) => -Math.exp(-x) : Math.exp,
    ticks: (d0, d1, count) => logTicks(d0, d1, count, base),
    nice: (d0, d1) => {
      const reverse = d1 < d0;
      const a = pow(Math.floor(log(reverse ? d1 : d0)));
      const b = pow(Math.ceil(log(reverse ? d0 : d1)));
      return reverse ? [b, a] : [a, b];
    },
  })(domain, range, options);
}

/**
 * Bi-symmetric log scale: linear near 0, logarithmic in the tails, and defined across 0 (for data
 * that crosses zero with heavy tails). `constant` sets the width of the linear region (default 1).
 */
export function scaleSymlog(domain: Domain, range: Range, options: ContinuousOptions & { constant?: number } = {}): ContinuousScale {
  const c = options.constant ?? 1;
  return factory("symlog", {
    ...LINEAR,
    forward: (x) => Math.sign(x) * Math.log1p(Math.abs(x / c)),
    backward: (x) => Math.sign(x) * Math.expm1(Math.abs(x)) * c,
  })(domain, range, options);
}

function timeTransform(options: TimeOptions): Transform {
  return {
    ...LINEAR,
    ticks: (d0, d1, count) => timeTicks(d0, d1, count, options).ticks,
    nice: (d0, d1, count) => niceTime(d0, d1, count, options),
  };
}

type TimeDomain = readonly [number | Date, number | Date];
const toMs = (d: TimeDomain): Domain => [+d[0], +d[1]];

/** UTC time scale: calendar ticks in UTC (deterministic on server and client). */
export function scaleUtc(domain: TimeDomain, range: Range, options: ContinuousOptions & Omit<TimeOptions, "utc"> = {}): ContinuousScale {
  return factory("utc", timeTransform({ ...options, utc: true }))(toMs(domain), range, options);
}

/** Local-time scale: ticks on the runtime's calendar. Prefer scaleUtc for SSR (zones differ). */
export function scaleTime(domain: TimeDomain, range: Range, options: ContinuousOptions & Omit<TimeOptions, "utc"> = {}): ContinuousScale {
  return factory("time", timeTransform({ ...options, utc: false }))(toMs(domain), range, options);
}

// ---------------------------------------------------------------------------------------------
// Band and point scales

export interface BandScale<K> {
  /** Start pixel of the band (NaN for unknown keys). */
  (key: K): number;
  readonly domain: readonly K[];
  readonly range: Range;
  readonly bandwidth: number;
  readonly step: number;
  /** Position of `key` in the domain, or -1. */
  index(key: K): number;
  /** The key whose band (including half the gap on each side) contains `px`, clamped to the ends. */
  at(px: number): K | undefined;
  copy(changes?: { domain?: readonly K[]; range?: Range }): BandScale<K>;
}

export interface BandOptions {
  /** Gap between bands as a fraction of the step, 0..1. Default 0. */
  paddingInner?: number;
  /** Space before the first and after the last band, in steps. Default 0. */
  paddingOuter?: number;
  /** Shorthand that sets both paddings. */
  padding?: number;
  /** Where leftover space goes: 0 = start, 0.5 = centered (default), 1 = end. */
  align?: number;
  /** Snap the step, start and bandwidth to whole pixels. Default false. */
  round?: boolean;
}

/**
 * Discrete bands for bar charts. A reversed range (r1 < r0) puts the first key at the high end,
 * which is what horizontal bar charts read top to bottom.
 */
export function scaleBand<K>(keys: readonly K[], range: Range, options: BandOptions = {}): BandScale<K> {
  const paddingInner = Math.min(1, options.paddingInner ?? options.padding ?? 0);
  const paddingOuter = options.paddingOuter ?? options.padding ?? 0;
  const align = Math.max(0, Math.min(1, options.align ?? 0.5));
  const round = options.round ?? false;
  const n = keys.length;
  const [r0, r1] = range;
  const reverse = r1 < r0;
  let start = reverse ? r1 : r0;
  const stop = reverse ? r0 : r1;
  let step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
  if (round) step = Math.floor(step);
  start += (stop - start - step * (n - paddingInner)) * align;
  let bandwidth = step * (1 - paddingInner);
  if (round) {
    start = Math.round(start);
    bandwidth = Math.round(bandwidth);
  }
  const index = new Map<K, number>();
  keys.forEach((k, i) => {
    if (!index.has(k)) index.set(k, i);
  });
  const slot = (i: number) => (reverse ? n - 1 - i : i);
  const scale = ((key: K) => {
    const i = index.get(key);
    return i === undefined ? Number.NaN : start + step * slot(i);
  }) as BandScale<K>;
  return Object.assign(scale, {
    domain: keys,
    range,
    bandwidth,
    step,
    index: (key: K) => index.get(key) ?? -1,
    at(px: number) {
      if (n === 0) return undefined;
      const raw = step ? Math.floor((px - start + (step * paddingInner) / 2) / step) : 0;
      const j = Math.max(0, Math.min(n - 1, raw));
      return keys[slot(j)];
    },
    copy: (changes: { domain?: readonly K[]; range?: Range } = {}) =>
      scaleBand(changes.domain ?? keys, changes.range ?? range, options),
  });
}

/** Evenly spaced points (a band scale with zero bandwidth): categorical line charts, dot plots. */
export function scalePoint<K>(keys: readonly K[], range: Range, options: Pick<BandOptions, "align" | "round"> & { padding?: number } = {}): BandScale<K> {
  return scaleBand(keys, range, { paddingInner: 1, paddingOuter: options.padding ?? 0, align: options.align, round: options.round });
}

// ---------------------------------------------------------------------------------------------
// Ordinal and quantize scales

export interface OrdinalScale<K, V> {
  (key: K): V;
  readonly domain: readonly K[];
  readonly range: readonly V[];
}

/** Maps keys to values in order, cycling when there are more keys than values (series colors). */
export function scaleOrdinal<K, V>(keys: readonly K[], values: readonly V[], unknown?: V): OrdinalScale<K, V> {
  const index = new Map<K, number>();
  keys.forEach((k, i) => {
    if (!index.has(k)) index.set(k, i);
  });
  const scale = ((key: K) => {
    const i = index.get(key);
    if (i === undefined || values.length === 0) return unknown as V;
    return values[i % values.length] as V;
  }) as OrdinalScale<K, V>;
  return Object.assign(scale, { domain: keys, range: values });
}

export interface QuantizeScale<V> {
  (value: number): V;
  readonly domain: Domain;
  readonly range: readonly V[];
  /** The n - 1 boundaries between buckets. */
  readonly thresholds: readonly number[];
}

/** Splits a continuous domain into equal buckets, one per range value (binned color legends). */
export function scaleQuantize<V>(domain: Domain, values: readonly V[]): QuantizeScale<V> {
  const [x0, x1] = domain;
  const n = values.length - 1;
  const thresholds: number[] = [];
  for (let i = 0; i < n; i++) thresholds.push(((i + 1) * x1 - (i - n) * x0) / (n + 1));
  const scale = ((value: number) => {
    if (!(value <= value)) return undefined as V; // NaN
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((thresholds[mid] as number) <= value) lo = mid + 1;
      else hi = mid;
    }
    return values[lo] as V;
  }) as QuantizeScale<V>;
  return Object.assign(scale, { domain, range: values, thresholds });
}
