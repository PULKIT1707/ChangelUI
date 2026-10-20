// Natural-language chart summaries and point announcements for screen readers. Numbers, percents
// and dates go through Intl, so they follow the chart locale; sentence templates are English and
// can be replaced through the `phrases` option.
import { anomalies, extremes } from "./insights";
import { DEFAULT_LOCALE, formatNumber, getNumberFormat, type NumberFormat } from "./format";

export interface SummarySeries {
  label: string;
  /** Display labels for each x ("Jan", "Mar 4, 2026"). */
  xs: readonly string[];
  ys: ReadonlyArray<number | null | undefined>;
  format?: NumberFormat;
}

export interface SummaryPhrases {
  noData: (label: string) => string;
  flat: string;
  rises: (pct: string) => string;
  falls: (pct: string) => string;
  /** "{label} {trend} from {first} ({x0}) to {last} ({x1})." */
  trend: (p: { label: string; trend: string; first: string; x0: string; last: string; x1: string }) => string;
  extremes: (p: { max: string; xMax: string; min: string; xMin: string }) => string;
  anomalies: (count: number) => string;
  more: (count: number) => string;
}

export const ENGLISH_PHRASES: SummaryPhrases = {
  noData: (label) => `${label}: no data.`,
  flat: "is roughly flat",
  rises: (pct) => `rises ${pct}`,
  falls: (pct) => `falls ${pct}`,
  trend: ({ label, trend, first, x0, last, x1 }) => `${label} ${trend} from ${first} (${x0}) to ${last} (${x1}).`,
  extremes: ({ max, xMax, min, xMin }) => `Peak ${max} in ${xMax}; low ${min} in ${xMin}.`,
  anomalies: (count) => (count === 1 ? "1 unusual value." : `${count} unusual values.`),
  more: (count) => (count === 1 ? "And 1 more series." : `And ${count} more series.`),
};

export interface SummaryOptions {
  locale?: string;
  /** Changes smaller than this fraction read as "roughly flat". Default 0.01. */
  flatThreshold?: number;
  /** Series described before "and N more". Default 4. */
  maxSeries?: number;
  phrases?: Partial<SummaryPhrases>;
  /** Mention MAD anomalies. Default true. */
  anomalies?: boolean;
}

/** One series: "Revenue rises 23% from $39K (Jan) to $48K (Dec). Peak $52K in Nov; low $31K in Mar." */
export function summarizeSeries(series: SummarySeries, options: SummaryOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const p = { ...ENGLISH_PHRASES, ...options.phrases };
  const fmt = (v: number) => formatNumber(v, series.format ?? { notation: "compact", maximumFractionDigits: 1 }, locale);
  const defined = series.ys.map((v, i) => [v, i] as const).filter((e): e is readonly [number, number] => typeof e[0] === "number" && Number.isFinite(e[0]));
  if (!defined.length) return p.noData(series.label);
  const [first, i0] = defined[0] as readonly [number, number];
  const [last, i1] = defined[defined.length - 1] as readonly [number, number];
  const change = first ? (last - first) / Math.abs(first) : last ? Math.sign(last) : 0;
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(Math.abs(change));
  const trend = Math.abs(change) < (options.flatThreshold ?? 0.01) ? p.flat : change > 0 ? p.rises(pct) : p.falls(pct);
  const x = (i: number) => series.xs[i] ?? String(i + 1);
  const { max, min } = extremes(series.ys);
  let text = p.trend({ label: series.label, trend, first: fmt(first), x0: x(i0), last: fmt(last), x1: x(i1) });
  if (defined.length > 2) text += ` ${p.extremes({ max: fmt(series.ys[max] as number), xMax: x(max), min: fmt(series.ys[min] as number), xMin: x(min) })}`;
  if (options.anomalies ?? true) {
    const count = anomalies(series.ys).length;
    if (count) text += ` ${p.anomalies(count)}`;
  }
  return text;
}

/** One sentence group per visible series (up to maxSeries), then "And N more series." */
export function summarizeChart(series: readonly SummarySeries[], options: SummaryOptions = {}): string {
  const max = Math.max(1, options.maxSeries ?? 4);
  const p = { ...ENGLISH_PHRASES, ...options.phrases };
  const parts = series.slice(0, max).map((s) => summarizeSeries(s, options));
  if (series.length > max) parts.push(p.more(series.length - max));
  return parts.join(" ");
}

export interface PointDescription {
  seriesLabel: string;
  xLabel: string;
  value: number;
  /** Previous point (for "up 8% from February"). */
  previous?: { xLabel: string; value: number };
  index: number;
  count: number;
  format?: NumberFormat;
  locale?: string;
}

/** Live-region text for a focused point: "Revenue, March 2026: $12.4K, up 8% from February. Point 3 of 12." */
export function describePoint(d: PointDescription): string {
  const locale = d.locale ?? DEFAULT_LOCALE;
  const value = formatNumber(d.value, d.format ?? {}, locale);
  let text = `${d.seriesLabel}, ${d.xLabel}: ${value}`;
  if (d.previous && Number.isFinite(d.previous.value)) {
    const prev = d.previous.value;
    if (prev === d.value) text += `, unchanged from ${d.previous.xLabel}`;
    else if (prev) {
      const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(Math.abs((d.value - prev) / prev));
      text += `, ${d.value > prev ? "up" : "down"} ${pct} from ${d.previous.xLabel}`;
    }
  }
  return `${text}. Point ${d.index + 1} of ${d.count}.`;
}
