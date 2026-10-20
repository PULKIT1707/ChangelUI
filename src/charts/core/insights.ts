// Automatic insights for annotations and summaries: extremes, robust anomalies, level shifts,
// threshold crossings and streaks. Pure statistics, no AI.
import { mad, median } from "./stats";

export type Insight =
  | { type: "max" | "min"; index: number; value: number }
  | { type: "anomaly"; index: number; value: number; /** Robust z-score (MAD-based). */ score: number }
  | { type: "change"; index: number; /** Mean after minus mean before the shift. */ delta: number }
  | { type: "crossing"; index: number; /** Fractional index where the segment hits the threshold. */ at: number; direction: "up" | "down"; threshold: number }
  | { type: "streak"; start: number; end: number; direction: "up" | "down"; length: number };

type Num = number | null | undefined;
const ok = (v: Num): v is number => v !== null && v !== undefined && Number.isFinite(v);

/** Index of the maximum and minimum finite value (first occurrence), or -1. */
export function extremes(ys: readonly Num[]): { max: number; min: number } {
  let max = -1;
  let min = -1;
  ys.forEach((v, i) => {
    if (!ok(v)) return;
    if (max < 0 || v > (ys[max] as number)) max = i;
    if (min < 0 || v < (ys[min] as number)) min = i;
  });
  return { max, min };
}

/**
 * Points whose robust z-score |x - median| / (1.4826 * MAD) exceeds `threshold` (default 3.5,
 * Iglewicz and Hoaglin). Robust to the outliers themselves, unlike mean/sd. When more than half
 * the values are identical (MAD = 0, e.g. a flat line with one spike) the mean absolute deviation
 * scaled by 1.2533 stands in, so the spike is still found.
 */
export function anomalies(ys: readonly Num[], threshold = 3.5): Array<{ index: number; value: number; score: number }> {
  const values = ys.filter(ok);
  const m = median(values);
  if (m === undefined) return [];
  const spread = mad(values) as number;
  const meanAbs = values.reduce((a, v) => a + Math.abs(v - m), 0) / values.length;
  const sigma = spread ? 1.4826 * spread : 1.2533 * meanAbs;
  if (!sigma) return [];
  const out: Array<{ index: number; value: number; score: number }> = [];
  ys.forEach((v, i) => {
    if (!ok(v)) return;
    const score = (v - m) / sigma;
    if (Math.abs(score) > threshold) out.push({ index: i, value: v, score });
  });
  return out;
}

/**
 * Level shifts via a robust two-sided CUSUM: reports the index where a sustained move of more
 * than `drift` sigmas began, once the cumulative sum passes `threshold` sigmas. Sigma comes from
 * successive differences (unaffected by the shift itself) and each step is clamped to 3 sigma, so
 * a single spike is an anomaly, not a level shift. Restarts after each detection.
 */
export function changePoints(ys: readonly Num[], options: { threshold?: number; drift?: number } = {}): Array<{ index: number; delta: number }> {
  const h = options.threshold ?? 5;
  const k = options.drift ?? 0.5;
  const idx: number[] = [];
  const vals: number[] = [];
  ys.forEach((v, i) => {
    if (ok(v)) {
      idx.push(i);
      vals.push(v);
    }
  });
  if (vals.length < 4) return [];
  const diffs = vals.slice(1).map((v, j) => Math.abs(v - (vals[j] as number)));
  // For iid noise, |x_i - x_i-1| has median 0.6745 * sqrt(2) * sigma and mean (2 / sqrt(pi)) * sigma.
  const sigma =
    (median(diffs) as number) / (0.6745 * Math.SQRT2) || diffs.reduce((a, d) => a + d, 0) / diffs.length / (2 / Math.sqrt(Math.PI)) || 1;
  const out: Array<{ index: number; delta: number }> = [];
  let base = 0;
  let ref = median(vals.slice(0, Math.min(5, vals.length))) as number;
  let hi = 0;
  let lo = 0;
  let hiStart = 0;
  let loStart = 0;
  for (let j = 1; j < vals.length; j++) {
    const z = Math.max(-3, Math.min(3, ((vals[j] as number) - ref) / sigma));
    if (hi <= 0) hiStart = j;
    if (lo <= 0) loStart = j;
    hi = Math.max(0, hi + z - k);
    lo = Math.max(0, lo - z - k);
    if (hi > h || lo > h) {
      // CUSUM knows a shift happened by j; place it at the split of [base, j] that best separates
      // two means (maximizes n1 * n2 * (mean2 - mean1)^2). The CUSUM start is the fallback.
      let start = hi > h ? hiStart : loStart;
      let best = -1;
      let total = 0;
      for (let q = base; q <= j; q++) total += vals[q] as number;
      let left = 0;
      for (let s = base + 1; s <= j; s++) {
        left += vals[s - 1] as number;
        const n1 = s - base;
        const n2 = j + 1 - s;
        const score = n1 * n2 * ((total - left) / n2 - left / n1) ** 2;
        if (score > best) {
          best = score;
          start = s;
        }
      }
      const before = vals.slice(base, start);
      const after = vals.slice(start, j + 1);
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
      out.push({ index: idx[start] as number, delta: mean(after) - mean(before.length ? before : [ref]) });
      base = start;
      ref = median(after) as number;
      hi = 0;
      lo = 0;
    }
  }
  return out;
}

/** Where consecutive points cross `threshold`, with the interpolated fractional index. */
export function crossings(ys: readonly Num[], threshold: number): Array<{ index: number; at: number; direction: "up" | "down" }> {
  const out: Array<{ index: number; at: number; direction: "up" | "down" }> = [];
  let prev = -1;
  ys.forEach((v, i) => {
    if (!ok(v)) return;
    if (prev >= 0) {
      const a = ys[prev] as number;
      if ((a < threshold && v >= threshold) || (a > threshold && v <= threshold)) {
        const t = v === a ? 0 : (threshold - a) / (v - a);
        out.push({ index: i, at: prev + t * (i - prev), direction: v > a ? "up" : "down" });
      }
    }
    prev = i;
  });
  return out;
}

/** The longest run of strictly increasing and of strictly decreasing steps (at least `min` steps). */
export function streaks(ys: readonly Num[], min = 3): Array<{ start: number; end: number; direction: "up" | "down"; length: number }> {
  const best: Record<"up" | "down", { start: number; end: number; length: number } | null> = { up: null, down: null };
  let dir: "up" | "down" | null = null;
  let start = -1;
  let prev = -1;
  let len = 0;
  const close = (end: number) => {
    if (dir && len >= min && (!best[dir] || len > (best[dir]?.length ?? 0))) best[dir] = { start, end, length: len };
  };
  ys.forEach((v, i) => {
    if (!ok(v)) return;
    if (prev >= 0) {
      const a = ys[prev] as number;
      const d = v > a ? "up" : v < a ? "down" : null;
      if (d && d === dir) len++;
      else {
        close(prev);
        dir = d;
        start = prev;
        len = d ? 1 : 0;
      }
    }
    prev = i;
  });
  close(prev);
  return (["up", "down"] as const).flatMap((d) => {
    const s = best[d];
    return s ? [{ ...s, direction: d }] : [];
  });
}

export interface InsightOptions {
  anomalyThreshold?: number;
  /** Also report crossings of these values (targets, SLOs). */
  thresholds?: readonly number[];
  changePoints?: boolean;
  streakMin?: number;
}

/** Every insight for one series, ordered by index. */
export function detectInsights(ys: readonly Num[], options: InsightOptions = {}): Insight[] {
  const out: Insight[] = [];
  const { max, min } = extremes(ys);
  if (max >= 0) out.push({ type: "max", index: max, value: ys[max] as number });
  if (min >= 0 && min !== max) out.push({ type: "min", index: min, value: ys[min] as number });
  for (const a of anomalies(ys, options.anomalyThreshold)) out.push({ type: "anomaly", ...a });
  if (options.changePoints ?? true) for (const c of changePoints(ys)) out.push({ type: "change", ...c });
  for (const t of options.thresholds ?? []) for (const c of crossings(ys, t)) out.push({ type: "crossing", threshold: t, ...c });
  for (const s of streaks(ys, options.streakMin)) out.push({ type: "streak", ...s });
  const at = (i: Insight) => ("index" in i ? i.index : i.start);
  return out.sort((a, b) => at(a) - at(b));
}
