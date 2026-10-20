"use client";

// Candlestick chart: OHLC candles (filled, hollow, OHLC bars or a close line) on a gap-free time
// axis (index based, so weekends and holidays leave no holes), a volume pane, SMA / EMA /
// Bollinger overlays, a TradingView-style crosshair with price and time pills, an OHLC legend that
// follows the pointer, a last-price line, and zoom + pan (Ctrl/Cmd+wheel, drag, +/- keys, a
// navigator minimap). The visible window and the price axis glide on a spring, so a new candle
// slides in and the last candle's close tweens live. Dense windows aggregate candles into true
// OHLC buckets instead of dropping them.
import { motion, type Transition } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { useLatestRef } from "../lib/use-latest-ref";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor, trendColor, withOpacity } from "./core/color";
import { formatDate, formatNumber, getNumberFormat, multiTimeFormat, type DateFormat, type NumberFormat } from "./core/format";
import { ChartFigure, ChartTable, useChartUid } from "./core/frame";
import { areaPath, linePath } from "./core/path";
import { bisectLeft } from "./core/spatial";
import { bollinger, ema, sma } from "./core/stats";
import { nice, ticks as niceTicks, timeTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";
import { useGlide } from "./core/glide";

const instant: Transition = { duration: 0 };

export type CandlestickOverlay =
  | { type: "sma" | "ema"; period: number; color?: string; label?: string }
  | { type: "bollinger"; period?: number; k?: number; color?: string; label?: string };

export interface CandleInfo<T> {
  index: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  /** Close vs the previous close (fraction). */
  change: number | null;
  datum: T;
}

export interface CandlestickChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  data: readonly T[];
  /** Period start: epoch ms, Date or ISO string. */
  x: Accessor<T, number | Date | string>;
  open: Accessor<T, number>;
  high: Accessor<T, number>;
  low: Accessor<T, number>;
  close: Accessor<T, number>;
  volume?: Accessor<T, number | null | undefined>;
  /** Default "candle". */
  type?: "candle" | "hollow" | "ohlc" | "line";
  overlays?: readonly CandlestickOverlay[];
  /** Volume pane (when `volume` is set). Default true. */
  volumePane?: boolean;
  /** Navigator minimap under the chart. Default true. */
  navigator?: boolean;
  /** Dashed last-price line with a pill. Default true. */
  lastPrice?: boolean;
  /** Blue / amber instead of green / red. */
  colorblind?: boolean;
  /** Candles visible at first (from the end). Default 90. */
  defaultVisible?: number;
  /** Price pane height in px. Default 320. */
  height?: number;
  format?: NumberFormat;
  volumeFormat?: NumberFormat;
  dateFormat?: DateFormat;
  locale?: string;
  timeZone?: string;
  initialWidth?: number;
  animation?: ChartAnimation;
  title?: React.ReactNode;
  description?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  onActiveChange?: (candle: CandleInfo<T> | null) => void;
  summary?: string;
  chartLabel?: string;
}

interface Bucket {
  /** Center position in index space. */
  c: number;
  i0: number;
  i1: number;
  o: number;
  h: number;
  l: number;
  cl: number;
  v: number;
}

const toTime = (v: number | Date | string) => (typeof v === "string" ? Date.parse(v.length === 10 ? `${v}T00:00:00Z` : v) : +v);

function CandlestickChartInner<T>(props: CandlestickChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    open,
    high,
    low,
    close,
    volume,
    type = "candle",
    overlays = [],
    volumePane = true,
    navigator = true,
    lastPrice = true,
    colorblind = false,
    defaultVisible = 90,
    height = 320,
    format,
    volumeFormat,
    dateFormat = { dateStyle: "medium" },
    locale = "en-US",
    timeZone = "UTC",
    initialWidth = 720,
    animation = "auto",
    title,
    description,
    titleAs,
    onActiveChange,
    summary,
    chartLabel,
    className,
    ...rest
  } = props;
  const uid = useChartUid();
  const anim = useChartAnimation(animation);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const plotRef = React.useRef<HTMLDivElement>(null);
  const { width } = useChartSize(boxRef, { initialWidth, height: 100 });
  const [hover, setHover] = React.useState<{ i: number; y: number } | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [tableVisible, setTableVisible] = React.useState(false);
  const [hiddenOverlays, setHiddenOverlays] = React.useState<ReadonlySet<number>>(() => new Set());

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale), [format, locale]);
  const fmtVol = React.useCallback((v: number) => formatNumber(v, volumeFormat ?? { notation: "compact", maximumFractionDigits: 1 }, locale), [volumeFormat, locale]);
  const pct = getNumberFormat(locale, { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });

  // Columns.
  const cols = React.useMemo(() => {
    const n = data.length;
    const t = new Float64Array(n);
    const o = new Float64Array(n);
    const h = new Float64Array(n);
    const l = new Float64Array(n);
    const c = new Float64Array(n);
    const v = new Float64Array(n);
    let hasVolume = false;
    data.forEach((d, i) => {
      t[i] = toTime(readAccessor(x, d, i));
      o[i] = Number(readAccessor(open, d, i));
      h[i] = Number(readAccessor(high, d, i));
      l[i] = Number(readAccessor(low, d, i));
      c[i] = Number(readAccessor(close, d, i));
      const vol = volume ? readAccessor(volume, d, i) : null;
      v[i] = typeof vol === "number" && Number.isFinite(vol) ? vol : Number.NaN;
      if (!Number.isNaN(v[i] as number)) hasVolume = true;
    });
    return { n, t, o, h, l, c, v, hasVolume };
  }, [data, x, open, high, low, close, volume]);
  const { n } = cols;
  const closes = React.useMemo(() => Array.from(cols.c), [cols]);
  const overlayLines = React.useMemo(
    () =>
      overlays.map((ov, k) => {
        const color = ov.color ?? categoricalColor(k === 0 ? 0 : k + 4);
        if (ov.type === "bollinger") {
          const b = bollinger(closes, ov.period ?? 20, ov.k ?? 2);
          return { kind: "band" as const, label: ov.label ?? `BB ${ov.period ?? 20}`, color, mid: b.middle, upper: b.upper, lower: b.lower };
        }
        const line = ov.type === "sma" ? sma(closes, ov.period) : ema(closes, ov.period);
        return { kind: "line" as const, label: ov.label ?? `${ov.type.toUpperCase()} ${ov.period}`, color, mid: line, upper: line, lower: line };
      }),
    [overlays, closes],
  );

  // Window (index space, end exclusive). Follows the latest candle when it was at the end.
  const initialWindow = (): [number, number] => [Math.max(0, n - Math.min(n, defaultVisible)), n];
  const [win, setWin] = React.useState<[number, number]>(initialWindow);
  const [prevN, setPrevN] = React.useState(n);
  if (prevN !== n) {
    setPrevN(n);
    const atEnd = win[1] >= prevN - 0.5;
    if (atEnd) {
      const span = win[1] - win[0];
      setWin([Math.max(0, n - span), n]);
    } else if (win[1] > n) setWin([Math.max(0, n - (win[1] - win[0])), n]);
  }
  const winRef = useLatestRef(win);
  const minSpan = Math.min(n, 12);
  const clampWin = (a: number, b: number): [number, number] => {
    let span = Math.max(minSpan, Math.min(n, b - a));
    if (!Number.isFinite(span) || span <= 0) span = n;
    let s = Math.max(0, Math.min(n - span, a));
    if (!Number.isFinite(s)) s = 0;
    return [s, s + span];
  };
  const shown = useGlide(win, anim.updates && !dragging, chartMotion.layout);
  const w0 = shown[0] as number;
  const w1 = shown[1] as number;

  // Geometry.
  const W = Math.max(240, width);
  const axisW = Math.max(52, Math.ceil(fmt(Math.max(1, ...Array.from(cols.h.slice(-50)).filter(Number.isFinite))).length * 6.4) + 16);
  const left = 6;
  const m = { left, right: axisW, top: 8 };
  const plotW = Math.max(40, W - m.left - m.right);
  const showVolume = volumePane && cols.hasVolume;
  const volH = showVolume ? Math.round(height * 0.22) : 0;
  const priceH = height - (showVolume ? volH + 6 : 0);
  const xAxisH = 22;
  const H = m.top + height + xAxisH;
  const span = Math.max(1e-6, w1 - w0);
  const ppc = plotW / span;
  const xOf = (i: number) => m.left + (i + 0.5 - w0) * ppc;

  // Visible buckets (aggregated when candles get thinner than 3 px).
  const bucket = Math.max(1, Math.ceil(3 / ppc));
  const buckets = React.useMemo(() => {
    const out: Bucket[] = [];
    const s = Math.max(0, Math.floor(w0 / bucket) * bucket - bucket);
    const e = Math.min(n, Math.ceil(w1) + bucket);
    for (let i = s; i < e; i += bucket) {
      const j = Math.min(n, i + bucket);
      let hh = -Infinity;
      let ll = Infinity;
      let vv = 0;
      for (let k = i; k < j; k++) {
        hh = Math.max(hh, cols.h[k] as number);
        ll = Math.min(ll, cols.l[k] as number);
        if (!Number.isNaN(cols.v[k] as number)) vv += cols.v[k] as number;
      }
      out.push({ c: (i + j - 1) / 2, i0: i, i1: j - 1, o: cols.o[i] as number, h: hh, l: ll, cl: cols.c[j - 1] as number, v: vv });
    }
    return out;
  }, [cols, w0, w1, bucket, n]);

  // Price domain of the TARGET window (it glides separately).
  const targetDomain = React.useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let vmax = 0;
    const a = Math.max(0, Math.floor(win[0]));
    const b = Math.min(n, Math.ceil(win[1]));
    for (let i = a; i < b; i++) {
      lo = Math.min(lo, cols.l[i] as number);
      hi = Math.max(hi, cols.h[i] as number);
      if (!Number.isNaN(cols.v[i] as number)) vmax = Math.max(vmax, cols.v[i] as number);
      overlayLines.forEach((ov, k) => {
        if (hiddenOverlays.has(k)) return;
        const u = ov.upper[i] as number;
        const d = ov.lower[i] as number;
        if (Number.isFinite(u)) hi = Math.max(hi, u);
        if (Number.isFinite(d)) lo = Math.min(lo, d);
      });
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.06;
    return [lo - pad, hi + pad, vmax || 1];
  }, [win, cols, n, overlayLines, hiddenOverlays]);
  const dom = useGlide(targetDomain, anim.updates);
  const [y0, y1, vMax] = [dom[0] as number, dom[1] as number, dom[2] as number];
  const priceTop = m.top;
  const priceBottom = m.top + priceH;
  const yOf = (v: number) => priceBottom - ((v - y0) / (y1 - y0 || 1)) * priceH;
  const priceAt = (py: number) => y0 + ((priceBottom - py) / priceH) * (y1 - y0);
  const volTop = priceBottom + 6;
  const volY = (v: number) => volTop + volH - (v / (vMax || 1)) * volH;
  const [tl0, tl1] = nice(y0, y1, 6);
  const priceTicks = niceTicks(tl0, tl1, 6).filter((t) => t >= y0 && t <= y1);

  // Time ticks mapped onto the gap-free axis.
  const timeFmt = React.useMemo(() => multiTimeFormat(locale, timeZone), [locale, timeZone]);
  const xTicks = React.useMemo(() => {
    const a = Math.max(0, Math.floor(w0));
    const b = Math.min(n - 1, Math.ceil(w1) - 1);
    if (b <= a) return [];
    const { ticks: ts } = timeTicks(cols.t[a] as number, cols.t[b] as number, Math.max(2, Math.floor(plotW / 90)), { utc: timeZone === "UTC" });
    const out: Array<{ i: number; label: string }> = [];
    let last = -Infinity;
    for (const t of ts) {
      const i = bisectLeft(cols.t, t);
      if (i >= n || i <= last) continue;
      const at = (k: number) => left + (k + 0.5 - w0) * (plotW / Math.max(1e-6, w1 - w0));
      const px = at(i);
      if (px < left + 10 || px > left + plotW - 10) continue;
      if (out.length && px - at(out[out.length - 1]?.i ?? 0) < 54) continue;
      out.push({ i, label: timeFmt(cols.t[i] as number) });
      last = i;
    }
    return out;
  }, [w0, w1, n, cols, plotW, left, timeFmt, timeZone]);

  const up = trendColor("up", colorblind);
  const down = trendColor("down", colorblind);
  const info = (i: number): CandleInfo<T> => {
    const prev = i > 0 ? (cols.c[i - 1] as number) : null;
    const c = cols.c[i] as number;
    return {
      index: i,
      time: cols.t[i] as number,
      open: cols.o[i] as number,
      high: cols.h[i] as number,
      low: cols.l[i] as number,
      close: c,
      volume: Number.isNaN(cols.v[i] as number) ? null : (cols.v[i] as number),
      change: prev ? (c - prev) / Math.abs(prev) : null,
      datum: data[i] as T,
    };
  };
  const activeIndex = focus ?? hover?.i ?? null;
  const legendIndex = activeIndex ?? (n ? n - 1 : null);
  const legendInfo = legendIndex !== null && legendIndex < n ? info(legendIndex) : null;
  const infoRef = useLatestRef(info);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === activeIndex) return;
    lastActive.current = activeIndex;
    onActiveChange?.(activeIndex === null || activeIndex >= n ? null : infoRef.current(activeIndex));
  }, [activeIndex, n, onActiveChange, infoRef]);

  const describe = (i: number) => {
    const c = info(i);
    return `${formatDate(c.time, dateFormat, locale, timeZone)}: open ${fmt(c.open)}, high ${fmt(c.high)}, low ${fmt(c.low)}, close ${fmt(c.close)}${c.change !== null ? `, ${pct.format(c.change)}` : ""}${c.volume !== null ? `, volume ${fmtVol(c.volume)}` : ""}.`;
  };

  // Pointer: crosshair, drag to pan, Ctrl/Cmd + wheel to zoom.
  const local = (event: { clientX: number; clientY: number }, el: Element) => {
    const rect = el.getBoundingClientRect();
    return { px: ((event.clientX - rect.left) / (rect.width || 1)) * W, py: ((event.clientY - rect.top) / (rect.height || 1)) * H };
  };
  const indexAt = (px: number) => Math.max(0, Math.min(n - 1, Math.floor(w0 + (px - m.left) / ppc)));
  const panRef = React.useRef<{ x: number; win: [number, number]; pointer: number; moved: boolean } | null>(null);
  React.useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const [a, b] = winRef.current;
      const rect = el.getBoundingClientRect();
      const fx = Math.max(0, Math.min(1, ((event.clientX - rect.left) / (rect.width || 1)) * (W / plotW) - m.left / plotW));
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const k = Math.exp(event.deltaY * 0.0022);
        const s = b - a;
        const ns = s * k;
        const anchor = a + s * fx;
        setWin(clampWin(anchor - ns * fx, anchor - ns * fx + ns));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        event.preventDefault();
        const d = ((event.shiftKey ? event.deltaY : event.deltaX) / plotW) * (b - a);
        setWin(clampWin(a + d, b + d));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  const zoomBy = (k: number) => {
    const [a, b] = win;
    const mid = activeIndex !== null ? activeIndex + 0.5 : (a + b) / 2;
    const f = (mid - a) / (b - a || 1);
    const ns = (b - a) * k;
    setWin(clampWin(mid - ns * f, mid - ns * f + ns));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n || event.metaKey || event.ctrlKey) return;
    const [a, b] = win;
    const cur = focus ?? Math.min(n - 1, Math.ceil(b) - 1);
    let next: number | null = null;
    if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const d = (b - a) * 0.1 * (event.key === "ArrowLeft" ? -1 : 1);
      setWin(clampWin(a + d, b + d));
      return;
    }
    if (event.key === "ArrowRight") next = focus === null ? cur : Math.min(n - 1, cur + 1);
    else if (event.key === "ArrowLeft") next = focus === null ? cur : Math.max(0, cur - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(event.key === "+" || event.key === "=" ? 1 / 1.3 : 1.3);
      return;
    } else if (event.key === "0") {
      event.preventDefault();
      setWin(initialWindow());
      setAnnouncement("Zoom reset.");
      return;
    } else if (event.key === "Escape" && focus !== null) {
      event.preventDefault();
      setFocus(null);
      return;
    } else if (event.key === "t" || event.key === "T") {
      event.preventDefault();
      setTableVisible((v) => !v);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    // Keep the focused candle in view.
    if (next < a + 1) setWin(clampWin(next - 1, next - 1 + (b - a)));
    else if (next > b - 2) setWin(clampWin(next + 2 - (b - a), next + 2));
    setAnnouncement(describe(next));
  };

  // Navigator.
  const navH = 46;
  const navX = (i: number) => m.left + (i / Math.max(1, n)) * plotW;
  const navPath = React.useMemo(() => {
    if (!n) return "";
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of cols.c) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const step = Math.max(1, Math.floor(n / plotW));
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < n; i += step) pts.push([m.left + ((i + 0.5) / n) * plotW, 4 + (1 - ((cols.c[i] as number) - lo) / (hi - lo || 1)) * (navH - 10), navH - 2]);
    return areaPath(pts);
  }, [cols, n, plotW, m.left]);
  const navDrag = React.useRef<{ mode: "move" | "a" | "b"; x0: number; win: [number, number]; pointer: number } | null>(null);
  const onNavDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / (rect.width || 1)) * W;
    const xa = navX(win[0]);
    const xb = navX(win[1]);
    let mode: "move" | "a" | "b" = "move";
    if (Math.abs(px - xa) < 7) mode = "a";
    else if (Math.abs(px - xb) < 7) mode = "b";
    else if (px < xa || px > xb) {
      const center = ((px - m.left) / plotW) * n;
      const s = win[1] - win[0];
      setWin(clampWin(center - s / 2, center + s / 2));
    }
    navDrag.current = { mode, x0: px, win: [...win] as [number, number], pointer: event.pointerId };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onNavMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = navDrag.current;
    if (!d || d.pointer !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / (rect.width || 1)) * W;
    const di = ((px - d.x0) / plotW) * n;
    if (d.mode === "move") setWin(clampWin(d.win[0] + di, d.win[1] + di));
    else if (d.mode === "a") setWin(clampWin(Math.min(d.win[0] + di, d.win[1] - minSpan), d.win[1]));
    else setWin(clampWin(d.win[0], Math.max(d.win[1] + di, d.win[0] + minSpan)));
  };
  const onNavUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (navDrag.current) event.currentTarget.releasePointerCapture?.(navDrag.current.pointer);
    navDrag.current = null;
    setDragging(false);
  };

  // Overlay paths over the visible range.
  const visA = Math.max(0, Math.floor(w0) - 1);
  const visB = Math.min(n, Math.ceil(w1) + 1);
  const overlayPaths = overlayLines.map((ov) => {
    const pts: Array<readonly [number, number] | null> = [];
    const up2: Array<readonly [number, number, number] | null> = [];
    for (let i = visA; i < visB; i += bucket) {
      const j = Math.min(n - 1, i + bucket - 1);
      const v = ov.mid[j] as number;
      pts.push(Number.isFinite(v) ? [xOf(j), yOf(v)] : null);
      if (ov.kind === "band") {
        const u = ov.upper[j] as number;
        const l = ov.lower[j] as number;
        up2.push(Number.isFinite(u) && Number.isFinite(l) ? [xOf(j), yOf(u), yOf(l)] : null);
      }
    }
    return {
      mid: linePath(pts),
      band: ov.kind === "band" ? areaPath(up2) : "",
      upper: ov.kind === "band" ? linePath(up2.map((p) => (p ? ([p[0], p[1]] as const) : null))) : "",
      lower: ov.kind === "band" ? linePath(up2.map((p) => (p ? ([p[0], p[2]] as const) : null))) : "",
    };
  });

  const last = n ? info(n - 1) : null;
  const lastUp = last ? last.close >= last.open : true;
  const nameText = chartLabel ?? (typeof title === "string" ? title : "Candlestick chart");
  const first = n ? info(0) : null;
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = 0; i < n; i++) {
    hi = Math.max(hi, cols.h[i] as number);
    lo = Math.min(lo, cols.l[i] as number);
  }
  const summaryText =
    summary ??
    (first && last
      ? `${n} periods from ${formatDate(first.time, dateFormat, locale, timeZone)} to ${formatDate(last.time, dateFormat, locale, timeZone)}. Close ${fmt(last.close)}, ${pct.format((last.close - first.open) / Math.abs(first.open || 1))} over the period; range ${fmt(lo)} to ${fmt(hi)}.`
      : "No data.");
  const bodyW = Math.max(1, Math.min(18, ppc * bucket * 0.68));
  const entranceDelay = (k: number, count: number) => (anim.entrance ? Math.min(0.6, (k / Math.max(1, count)) * 0.6) : 0);
  const pointerPrice = hover ? priceAt(hover.y) : null;
  const pillY = (v: number) => Math.max(priceTop + 8, Math.min(priceBottom - 8, yOf(v)));

  return (
    <ChartFigure ref={ref} uid={uid} title={title} description={description} titleAs={titleAs} label={nameText} summary={summaryText} {...rest} className={className}>
      {/* OHLC legend: follows the pointer, else shows the latest candle */}
      <div className={cn(blockReset, "flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-pui-muted-foreground")}>
        {legendInfo ? (
          <span aria-hidden="true" className={cn(blockReset, "flex flex-wrap items-center gap-x-3 gap-y-1")}>
            <span className={cn(blockReset, "font-medium text-pui-foreground")}>{formatDate(legendInfo.time, dateFormat, locale, timeZone)}</span>
            {(
              [
                ["O", legendInfo.open],
                ["H", legendInfo.high],
                ["L", legendInfo.low],
                ["C", legendInfo.close],
              ] as const
            ).map(([k, v]) => (
              <span key={k}>
                {k} <span className={cn(blockReset, "font-semibold", legendInfo.close >= legendInfo.open ? "text-pui-success-text" : "text-pui-danger-text")}>{fmt(v)}</span>
              </span>
            ))}
            {legendInfo.change !== null ? (
              <span className={cn(blockReset, "font-semibold", legendInfo.change >= 0 ? "text-pui-success-text" : "text-pui-danger-text")}>{pct.format(legendInfo.change)}</span>
            ) : null}
            {legendInfo.volume !== null ? <span>Vol {fmtVol(legendInfo.volume)}</span> : null}
          </span>
        ) : null}
        {overlayLines.map((ov, k) => {
          const v = legendIndex !== null ? (ov.mid[legendIndex] as number) : Number.NaN;
          const off = hiddenOverlays.has(k);
          return (
            <button
              key={k}
              type="button"
             
              aria-pressed={!off}
              onClick={() =>
                setHiddenOverlays((s) => {
                  const next = new Set(s);
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                })
              }
              className={cn(controlReset, focusRing, "inline-flex items-center gap-1 rounded-pui-sm px-1 hover:bg-pui-muted", off ? "opacity-40 line-through" : "")}
            >
              <span className={cn(blockReset, "h-0.5 w-3 rounded-pui-full")} style={{ background: ov.color }} />
              {ov.label}
              {Number.isFinite(v) ? <span className="font-semibold text-pui-foreground">{fmt(v)}</span> : null}
            </button>
          );
        })}
        <span className={cn(blockReset, "ms-auto inline-flex items-center gap-1")}>
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1.3)} className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}>
            &minus;
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1 / 1.3)} className={cn(controlReset, focusRing, "inline-flex size-6 items-center justify-center rounded-pui-md border border-pui-border hover:bg-pui-muted")}>
            +
          </button>
          <button
            type="button"
           
            onClick={() => setWin(initialWindow())}
            className={cn(controlReset, focusRing, "inline-flex h-6 items-center rounded-pui-md border border-pui-border px-2 hover:bg-pui-muted")}
          >
            Reset
          </button>
        </span>
      </div>
      <div ref={boxRef} className={cn(blockReset, "relative w-full select-none")} style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" className={cn(blockReset, "block")}>
          <defs>
            <clipPath id={`${uid}-clip`}>
              <rect x={m.left} y={0} width={plotW} height={H} />
            </clipPath>
          </defs>
          {/* Grid + price axis */}
          {priceTicks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + plotW} y1={yOf(t)} y2={yOf(t)} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={m.left + plotW + 8} y={yOf(t)} dy="0.35em" fontSize={10} fill="var(--pui-chart-axis)" className="tabular-nums">
                {fmt(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={t.i}>
              <line x1={xOf(t.i)} x2={xOf(t.i)} y1={priceTop} y2={m.top + height} stroke="var(--pui-chart-grid)" strokeDasharray="3 4" />
              <text x={xOf(t.i)} y={m.top + height + 15} textAnchor="middle" fontSize={10} fill="var(--pui-chart-axis)">
                {t.label}
              </text>
            </g>
          ))}
          <line x1={m.left + plotW} x2={m.left + plotW} y1={priceTop} y2={m.top + height} stroke="var(--pui-chart-axis)" />
          {showVolume ? <line x1={m.left} x2={m.left + plotW} y1={volTop - 3} y2={volTop - 3} stroke="var(--pui-border)" /> : null}
          <g clipPath={`url(#${uid}-clip)`}>
            {/* Overlays (bands under the candles) */}
            {overlayLines.map((ov, k) =>
              hiddenOverlays.has(k) || ov.kind !== "band" ? null : (
                <g key={`b${k}`}>
                  <path d={overlayPaths[k]?.band} fill={withOpacity(ov.color, 0.08)} />
                  <path d={overlayPaths[k]?.upper} fill="none" stroke={ov.color} strokeOpacity={0.5} strokeWidth={1} />
                  <path d={overlayPaths[k]?.lower} fill="none" stroke={ov.color} strokeOpacity={0.5} strokeWidth={1} />
                </g>
              ),
            )}
            {/* Volume */}
            {showVolume
              ? buckets.map((b, k) => {
                  const isUp = b.cl >= b.o;
                  const yv = volY(b.v);
                  return (
                    <motion.rect
                      key={`v${b.i0}`}
                      x={xOf(b.c) - bodyW / 2}
                      width={bodyW}
                      initial={anim.entrance ? { y: volTop + volH, height: 0.01 } : false}
                      animate={{ y: yv, height: Math.max(0.5, volTop + volH - yv) }}
                      transition={anim.reducedMotion ? instant : { ...chartMotion.size, delay: entranceDelay(k, buckets.length) }}
                      fill={isUp ? up : down}
                      opacity={activeIndex !== null && (activeIndex < b.i0 || activeIndex > b.i1) ? 0.22 : 0.4}
                    />
                  );
                })
              : null}
            {/* Candles */}
            {type === "line" ? (
              <motion.path
                d={linePath(buckets.map((b) => [xOf(b.c), yOf(b.cl)] as const), { curve: "monotone" })}
                initial={anim.entrance ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={anim.reducedMotion ? instant : chartMotion.drawLine}
                fill="none"
                stroke={categoricalColor(0)}
                strokeWidth={2}
              />
            ) : (
              buckets.map((b, k) => {
                const isUp = b.cl >= b.o;
                const color = isUp ? up : down;
                const cx = xOf(b.c);
                const top = yOf(Math.max(b.o, b.cl));
                const bot = yOf(Math.min(b.o, b.cl));
                const dim = activeIndex !== null && (activeIndex < b.i0 || activeIndex > b.i1);
                const delay = entranceDelay(k, buckets.length);
                const motionT = anim.reducedMotion ? instant : { ...chartMotion.update, delay };
                return (
                  <motion.g
                    key={b.i0}
                    initial={anim.entrance ? { opacity: 0, scaleY: 0 } : false}
                    animate={{ opacity: dim ? 0.55 : 1, scaleY: 1 }}
                    transition={anim.reducedMotion ? instant : { opacity: chartMotion.fade, scaleY: { ...chartMotion.growBar, delay } }}
                    style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
                  >
                    <motion.line initial={false} animate={{ x1: cx, x2: cx, y1: yOf(b.h), y2: yOf(b.l) }} transition={motionT} stroke={color} strokeWidth={1} />
                    {type === "ohlc" ? (
                      <>
                        <motion.line initial={false} animate={{ x1: cx - bodyW / 2, x2: cx, y1: yOf(b.o), y2: yOf(b.o) }} transition={motionT} stroke={color} strokeWidth={1.5} />
                        <motion.line initial={false} animate={{ x1: cx, x2: cx + bodyW / 2, y1: yOf(b.cl), y2: yOf(b.cl) }} transition={motionT} stroke={color} strokeWidth={1.5} />
                      </>
                    ) : (
                      <motion.rect
                        initial={false}
                        animate={{ x: cx - bodyW / 2, y: top, width: bodyW, height: Math.max(1, bot - top) }}
                        transition={motionT}
                        rx={Math.min(1.5, bodyW / 4)}
                        fill={type === "hollow" && isUp ? "var(--pui-background)" : color}
                        stroke={color}
                        strokeWidth={type === "hollow" ? 1.25 : 0}
                      />
                    )}
                  </motion.g>
                );
              })
            )}
            {/* Overlay lines */}
            {overlayLines.map((ov, k) =>
              hiddenOverlays.has(k) ? null : (
                <motion.path
                  key={`l${k}`}
                  d={overlayPaths[k]?.mid}
                  initial={anim.entrance ? { pathLength: 0, opacity: 0 } : false}
                  animate={{ pathLength: 1, opacity: 0.95 }}
                  transition={anim.reducedMotion ? instant : { pathLength: { duration: 1, delay: 0.35 }, opacity: { duration: 0.3, delay: 0.35 } }}
                  fill="none"
                  stroke={ov.color}
                  strokeWidth={1.5}
                  strokeDasharray={ov.kind === "band" ? "4 3" : undefined}
                />
              ),
            )}
          </g>
          {/* Last price */}
          {lastPrice && last ? (
            <g pointerEvents="none">
              <motion.line initial={false} animate={{ y1: yOf(last.close), y2: yOf(last.close) }} transition={anim.updates ? chartMotion.update : instant} x1={m.left} x2={m.left + plotW} stroke={lastUp ? up : down} strokeDasharray="2 3" strokeWidth={1} />
              <motion.g initial={false} animate={{ y: pillY(last.close) }} transition={anim.updates ? chartMotion.update : instant}>
                <rect x={m.left + plotW + 2} y={-9} width={axisW - 4} height={18} rx={4} fill={lastUp ? up : down} />
                <text x={m.left + plotW + 8} y={0} dy="0.35em" fontSize={10} fontWeight={700} fill="var(--pui-background)" className="tabular-nums">
                  {fmt(last.close)}
                </text>
              </motion.g>
            </g>
          ) : null}
          {/* Crosshair */}
          {activeIndex !== null && activeIndex < n ? (
            <g pointerEvents="none">
              <line x1={xOf(activeIndex)} x2={xOf(activeIndex)} y1={priceTop} y2={m.top + height} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 3" />
              {pointerPrice !== null && hover && hover.y >= priceTop && hover.y <= priceBottom ? (
                <>
                  <line x1={m.left} x2={m.left + plotW} y1={hover.y} y2={hover.y} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 3" />
                  <rect x={m.left + plotW + 2} y={hover.y - 9} width={axisW - 4} height={18} rx={4} fill="var(--pui-foreground)" />
                  <text x={m.left + plotW + 8} y={hover.y} dy="0.35em" fontSize={10} fontWeight={700} fill="var(--pui-background)" className="tabular-nums">
                    {fmt(pointerPrice)}
                  </text>
                </>
              ) : (
                <circle cx={xOf(activeIndex)} cy={yOf(cols.c[activeIndex] as number)} r={4} fill="var(--pui-background)" stroke="var(--pui-foreground)" strokeWidth={2} />
              )}
              {(() => {
                const label = formatDate(cols.t[activeIndex] as number, dateFormat, locale, timeZone);
                const wLabel = label.length * 6 + 14;
                const lx = Math.max(m.left, Math.min(m.left + plotW - wLabel, xOf(activeIndex) - wLabel / 2));
                return (
                  <>
                    <rect x={lx} y={m.top + height + 3} width={wLabel} height={17} rx={4} fill="var(--pui-foreground)" />
                    <text x={lx + wLabel / 2} y={m.top + height + 11.5} dy="0.35em" textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--pui-background)">
                      {label}
                    </text>
                  </>
                );
              })()}
            </g>
          ) : null}
        </svg>
        <div
          ref={plotRef}
          tabIndex={0}
          role="application"
          aria-roledescription="interactive price chart"
          aria-label={`${nameText}. Arrow keys move between candles, plus and minus zoom.`}
          aria-describedby={`${uid}-help`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            panRef.current = { x: event.clientX, win: [...win] as [number, number], pointer: event.pointerId, moved: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const p = panRef.current;
            const { px, py } = local(event, event.currentTarget);
            if (p && p.pointer === event.pointerId) {
              const rect = event.currentTarget.getBoundingClientRect();
              const dx = ((event.clientX - p.x) / (rect.width || 1)) * W;
              if (!p.moved && Math.abs(dx) < 3) return;
              if (!p.moved) setDragging(true);
              p.moved = true;
              const d = -dx / ppc;
              setWin(clampWin(p.win[0] + d, p.win[1] + d));
              setHover(null);
              return;
            }
            if (px < m.left || px > m.left + plotW) return setHover(null);
            setHover({ i: indexAt(px), y: py });
          }}
          onPointerUp={(event) => {
            if (panRef.current) event.currentTarget.releasePointerCapture?.(panRef.current.pointer);
            panRef.current = null;
            setDragging(false);
          }}
          onPointerLeave={() => !panRef.current && setHover(null)}
          onDoubleClick={() => setWin(initialWindow())}
          onKeyDown={onKeyDown}
          onBlur={() => setFocus(null)}
          className={cn(blockReset, focusRing, "absolute inset-x-0 top-0 rounded-pui-md", dragging ? "cursor-grabbing" : "cursor-crosshair")}
          style={{ height: m.top + height, touchAction: "pan-y" }}
        />
      </div>
      {navigator && n > 0 ? (
        <div
          aria-hidden="true"
          onPointerDown={onNavDown}
          onPointerMove={onNavMove}
          onPointerUp={onNavUp}
          className={cn(blockReset, "relative w-full cursor-ew-resize select-none")}
          style={{ height: navH, touchAction: "none" }}
        >
          <svg viewBox={`0 0 ${W} ${navH}`} width="100%" height="100%" className={cn(blockReset, "block")}>
            <rect x={m.left} y={0} width={plotW} height={navH} rx={6} fill="var(--pui-muted)" opacity={0.5} />
            <path d={navPath} fill={withOpacity(categoricalColor(0), 0.22)} stroke={categoricalColor(0)} strokeWidth={1} />
            <rect x={m.left} y={0} width={Math.max(0, navX(w0) - m.left)} height={navH} fill="var(--pui-background)" opacity={0.6} />
            <rect x={navX(w1)} y={0} width={Math.max(0, m.left + plotW - navX(w1))} height={navH} fill="var(--pui-background)" opacity={0.6} />
            <rect x={navX(w0)} y={0.75} width={Math.max(2, navX(w1) - navX(w0))} height={navH - 1.5} rx={5} fill="none" stroke="var(--pui-primary)" strokeWidth={1.5} style={{ cursor: "grab" }} />
            {[w0, w1].map((wv, k) => (
              <rect key={k} x={navX(wv) - 3} y={navH / 2 - 9} width={6} height={18} rx={3} fill="var(--pui-background)" stroke="var(--pui-primary)" strokeWidth={1.5} />
            ))}
          </svg>
        </div>
      ) : null}
      <span id={`${uid}-help`} className={srOnly}>
        Left and right arrows move between candles, Home and End jump to the first and last, Shift with an arrow pans, plus and minus zoom, 0 resets the zoom, T shows the data table. Hold Control or Command and scroll to zoom, drag to pan.
      </span>
      <ChartLiveRegion text={announcement} />
      <ChartTable
        caption={nameText}
        visible={tableVisible}
        columns={["Date", "Open", "High", "Low", "Close", ...(cols.hasVolume ? ["Volume"] : [])]}
        rows={Array.from({ length: n }, (_, i) => {
          const c = info(n - 1 - i);
          return [formatDate(c.time, dateFormat, locale, timeZone), fmt(c.open), fmt(c.high), fmt(c.low), fmt(c.close), ...(cols.hasVolume ? [c.volume === null ? "" : fmtVol(c.volume)] : [])];
        })}
      />
    </ChartFigure>
  );
}

/** OHLC candlesticks with volume, indicators, a TradingView-style crosshair, zoom, pan and a navigator. */
export const CandlestickChart = React.forwardRef(CandlestickChartInner) as (<T>(props: CandlestickChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
CandlestickChart.displayName = "CandlestickChart";
