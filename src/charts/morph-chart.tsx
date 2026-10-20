"use client";
// MorphChart: the same data flows between bar, line, area, pie, donut, treemap and waffle forms.
// Every mark is resampled to an N-point polygon and the target is rotated to the least-travel
// alignment, so shapes morph point by point (bars bend into wedges, wedges fold into tiles) instead
// of crossfading. Hover and tooltip work in every form; [ and ] switch forms from the keyboard.
import { animate, AnimatePresence, motion, useInView, useMotionValue, useTransform, type MotionValue, type Transition } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import { useIsomorphicLayoutEffect, useLatestRef } from "../lib/use-latest-ref";
import { ChartLiveRegion, srOnly } from "./core/a11y";
import { readAccessor, type Accessor } from "./core/cartesian-model";
import { categoricalColor } from "./core/color";
import { estimateTextWidth, formatNumber, getNumberFormat, type NumberFormat } from "./core/format";
import { fromNested, sortHierarchy, sumHierarchy, treemap } from "./core/hierarchy";
import { linePath, type Point } from "./core/path";
import { alignPolygon, arcPolygon, circlePolygon, polygonCentroid, polygonPath, rectPolygon, resamplePolygon, type Polygon } from "./core/polygon";
import { scaleLinear } from "./core/scale";
import { nice, ticks as niceTicks } from "./core/ticks";
import { chartMotion, useChartAnimation, type ChartAnimation } from "./core/use-chart-motion";
import { useChartSize } from "./core/use-chart-size";

export const MORPH_TYPES = ["bar", "line", "area", "pie", "donut", "treemap", "waffle"] as const;
export type MorphType = (typeof MORPH_TYPES)[number];

const TYPE_NAMES: Record<MorphType, string> = {
  bar: "bar chart",
  line: "line chart",
  area: "area chart",
  pie: "pie chart",
  donut: "donut chart",
  treemap: "treemap",
  waffle: "waffle chart",
};
const TYPE_LABELS: Record<MorphType, string> = { bar: "Bar", line: "Line", area: "Area", pie: "Pie", donut: "Donut", treemap: "Treemap", waffle: "Waffle" };
const instant: Transition = { duration: 0 };
const glide: Transition = { type: "spring", stiffness: 520, damping: 38, mass: 0.6 };
/** Seconds one mark takes to morph, and the stagger between marks (charts-roadmap 7). */
const MORPH_SECONDS = 0.55;
const STAGGER = 0.015;

export interface MorphChartItem<T> {
  index: number;
  label: string;
  value: number;
  /** Share of the total, 0..1. */
  share: number;
  /** 1 = largest. */
  rank: number;
  color: string;
  datum: T;
}

export interface MorphChartProps<T> extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children" | "color"> {
  data: readonly T[];
  /** Mark name: a column name or a function. */
  label: Accessor<T, string>;
  /** Mark value (negative values count as 0). */
  value: Accessor<T, number>;
  /** Per-mark color. Default: the chart palette (line and area use `seriesColor`). */
  color?: Accessor<T, string | undefined>;
  /** Controlled form. */
  type?: MorphType;
  /** Initial form (uncontrolled). Default "bar". */
  defaultType?: MorphType;
  onTypeChange?: (type: MorphType) => void;
  /** Forms offered by the switcher and the [ / ] keys, in order. Default all seven. */
  types?: readonly MorphType[];
  /** Show the built-in form switcher. Default true. */
  switcher?: boolean;
  /** Color of the single series in the line and area forms. Default --pui-chart-1. */
  seriesColor?: string;
  /** Points per polygon (more = smoother arcs, more work per frame). Default 48. */
  resolution?: number;
  /** Plot height in px. Default 300. */
  height?: number;
  /** Width before measuring (SSR viewBox). Default 640. */
  initialWidth?: number;
  /** Show the legend under the plot. Default true. */
  legend?: boolean;
  format?: NumberFormat;
  locale?: string;
  title?: React.ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  description?: React.ReactNode;
  /** Accessible name when there is no string title. Default "Chart". */
  ariaLabel?: string;
  /** Called with the hovered / focused mark (null when none). */
  onActiveChange?: (item: MorphChartItem<T> | null) => void;
  animation?: ChartAnimation;
}

interface Layout {
  polys: Polygon[];
  /** Tooltip anchor per mark. */
  anchors: Point[];
  /** Cartesian plot box (bar, line, area). */
  plot: { left: number; top: number; right: number; bottom: number; yTicks: Array<{ v: number; y: number }>; centers: number[]; points: Point[] };
  /** Waffle grid (for the gap overlay). */
  grid: { x: number; y: number; cell: number; cols: number; rows: number } | null;
  /** Pie / donut geometry. */
  radial: { cx: number; cy: number; r: number; inner: number } | null;
  /** Treemap rects for labels. */
  rects: Array<{ x: number; y: number; w: number; h: number }>;
}

/** Largest-remainder rounding of shares to `total` whole cells. */
function apportion(values: readonly number[], total: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) {
    const i = (order[k] as readonly [number, number])[1];
    out[i] = (out[i] as number) + 1;
  }
  return out;
}

/** Outline of a column-major run of waffle cells [a, b) (rows fill bottom to top). */
function waffleRegion(a: number, b: number, g: { x: number; y: number; cell: number; rows: number }): Polygon {
  const X = (c: number) => g.x + c * g.cell;
  const Y = (r: number) => g.y + (g.rows - r) * g.cell;
  if (b <= a) {
    const c = Math.floor(a / g.rows);
    const r = a % g.rows;
    return rectPolygon(X(c), Y(r), 0, 0);
  }
  const c0 = Math.floor(a / g.rows);
  const r0 = a % g.rows;
  const c1 = Math.floor((b - 1) / g.rows);
  const r1 = (b - 1) % g.rows;
  if (c0 === c1) return rectPolygon(X(c0), Y(r1 + 1), g.cell, (r1 + 1 - r0) * g.cell);
  return [
    [X(c0), Y(g.rows)],
    [X(c1), Y(g.rows)],
    [X(c1), Y(r1 + 1)],
    [X(c1 + 1), Y(r1 + 1)],
    [X(c1 + 1), Y(0)],
    [X(c0 + 1), Y(0)],
    [X(c0 + 1), Y(r0)],
    [X(c0), Y(r0)],
  ];
}

/** Every mark's polygon for one form (pure). */
function layoutMarks(type: MorphType, values: readonly number[], W: number, H: number, n: number, tickFmt: (v: number) => string): Layout {
  const count = values.length;
  const max = Math.max(0, ...values);
  const [, top] = nice(0, max > 0 ? max : 1, 4);
  const yTicksRaw = niceTicks(0, top, 4);
  const left = Math.ceil(Math.max(...yTicksRaw.map((v) => estimateTextWidth(tickFmt(v), 11)), 12)) + 12;
  const plotBox = { left, top: 14, right: W - 10, bottom: H - 26 };
  const y = scaleLinear([0, top], [plotBox.bottom, plotBox.top]);
  const step = (plotBox.right - plotBox.left) / Math.max(1, count);
  const centers = values.map((_, i) => plotBox.left + step * (i + 0.5));
  const points = values.map((v, i): Point => [centers[i] as number, y(v)]);
  const plot = { ...plotBox, yTicks: yTicksRaw.map((v) => ({ v, y: y(v) })), centers, points };
  const base: Layout = { polys: [], anchors: [], plot, grid: null, radial: null, rects: [] };
  const sum = values.reduce((a, b) => a + b, 0);

  if (type === "bar") {
    const w = Math.max(1, step * 0.66);
    base.polys = values.map((v, i) => {
      const yy = y(v);
      return rectPolygon((centers[i] as number) - w / 2, yy, w, Math.max(0.5, plotBox.bottom - yy));
    });
    base.anchors = points;
  } else if (type === "line") {
    base.polys = points.map(([px, py]) => circlePolygon(px, py, 5, n));
    base.anchors = points;
  } else if (type === "area") {
    base.polys = points.map(([px, py], i) => {
      const prev = points[i - 1];
      const next = points[i + 1];
      const l: Point = prev ? [(prev[0] + px) / 2, (prev[1] + py) / 2] : [px, py];
      const r: Point = next ? [(next[0] + px) / 2, (next[1] + py) / 2] : [px, py];
      return [l, [px, py], r, [r[0], plotBox.bottom], [l[0], plotBox.bottom]];
    });
    base.anchors = points;
  } else if (type === "pie" || type === "donut") {
    const cx = W / 2;
    const cy = (H - 4) / 2;
    const r = Math.max(8, Math.min(W, H) / 2 - 14);
    const inner = type === "donut" ? r * 0.6 : 0;
    const pad = count > 1 ? 0.012 : 0;
    let a = 0;
    base.radial = { cx, cy, r, inner };
    values.forEach((v) => {
      const span = sum > 0 ? (v / sum) * Math.PI * 2 : (Math.PI * 2) / Math.max(1, count);
      const a0 = a + Math.min(pad, span / 4);
      const a1 = a + span - Math.min(pad, span / 4);
      base.polys.push(arcPolygon(cx, cy, inner, r, a0, Math.max(a0, a1), n));
      const mid = (a0 + a1) / 2;
      const rr = inner > 0 ? (inner + r) / 2 : r * 0.62;
      base.anchors.push([cx + rr * Math.sin(mid), cy - rr * Math.cos(mid)]);
      a += span;
    });
  } else if (type === "treemap") {
    type Node = { i: number; v: number; kids?: Node[] };
    const box = { x: 8, y: 8, w: Math.max(1, W - 16), h: Math.max(1, H - 16) };
    const root = fromNested<Node>({ i: -1, v: 0, kids: values.map((v, i) => ({ i, v })) }, (d) => d.kids);
    sumHierarchy(root, (d) => (d.i >= 0 ? d.v : 0));
    sortHierarchy(root);
    treemap(root, { width: box.w, height: box.h, paddingInner: 3 });
    base.polys = values.map(() => rectPolygon(0, 0, 0, 0));
    base.rects = values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
    base.anchors = values.map((): Point => [W / 2, H / 2]);
    for (const c of root.children ?? []) {
      const i = c.data.i;
      const rect = { x: box.x + c.x0, y: box.y + c.y0, w: c.x1 - c.x0, h: c.y1 - c.y0 };
      base.polys[i] = rectPolygon(rect.x, rect.y, rect.w, rect.h);
      base.rects[i] = rect;
      base.anchors[i] = [rect.x + rect.w / 2, rect.y + rect.h / 2];
    }
  } else {
    const cols = 10;
    const rows = 10;
    const cell = Math.max(1, Math.min((W - 16) / cols, (H - 16) / rows));
    const g = { x: (W - cell * cols) / 2, y: (H - cell * rows) / 2, cell, cols, rows };
    base.grid = g;
    const cells = apportion(values, cols * rows);
    let at = 0;
    cells.forEach((k) => {
      const poly = waffleRegion(at, at + k, g);
      base.polys.push(poly);
      base.anchors.push(polygonCentroid(poly));
      at += k;
    });
  }
  // Keep every vertex so bars, tiles and waffle runs rest with exact flat tops and square corners.
  base.polys = base.polys.map((p) => resamplePolygon(p, n, { keepVertices: true }));
  return base;
}

/** backOut with a small overshoot: close to the layout spring (380/34), but deterministic per mark. */
function ease(x: number): number {
  const c1 = 0.7;
  const c3 = c1 + 1;
  const t = x - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

function lerpPolygon(a: Polygon, b: Polygon, t: number): Polygon {
  if (t >= 1) return b;
  if (t <= 0) return a;
  return b.map((q, i) => {
    const p = a[i] ?? q;
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  });
}

/** A polygon squashed onto the baseline (cartesian entrance) or into its centroid (others). */
function collapsed(poly: Polygon, type: MorphType, baseline: number): Polygon {
  if (type === "bar" || type === "area" || type === "line") return poly.map(([x]) => [x, baseline]);
  const [cx, cy] = polygonCentroid(poly);
  return poly.map((): Point => [cx, cy]);
}

function MorphMark({ shapes, index, color, opacity, fillOpacity, onEnter, onLeave, onClick }: {
  shapes: MotionValue<string[]>;
  index: number;
  color: string;
  opacity: number;
  fillOpacity: number;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const d = useTransform(shapes, (s) => s[index] ?? "");
  return (
    <motion.path
      d={d}
      initial={false}
      animate={{ opacity }}
      transition={chartMotion.fade}
      style={{ fill: color, fillOpacity, transition: "fill 380ms cubic-bezier(0.16,1,0.3,1), fill-opacity 200ms" }}
      stroke="var(--pui-background)"
      strokeWidth={0.75}
      strokeLinejoin="round"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onClick}
      className="cursor-pointer"
    />
  );
}

function TypeIcon({ type }: { type: MorphType }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cn(blockReset, "size-3.5 shrink-0")}>
      {type === "bar" ? <path {...common} d="M3 13V8M8 13V3M13 13V6" /> : null}
      {type === "line" ? <path {...common} d="M2 12l4-5 3 3 5-7" /> : null}
      {type === "area" ? <path d="M2 13V10l4-4 3 3 5-6v10z" fill="currentColor" opacity={0.85} /> : null}
      {type === "pie" ? <path d="M8 2a6 6 0 1 0 6 6H8z M9.5 1.2v5.3h5.3A6 6 0 0 0 9.5 1.2z" fill="currentColor" opacity={0.85} /> : null}
      {type === "donut" ? <circle cx="8" cy="8" r="4.8" {...common} strokeWidth={2.6} /> : null}
      {type === "treemap" ? <path {...common} d="M2.5 2.5h11v11h-11zM9 2.5v11M9 8h4.5M2.5 9H9" /> : null}
      {type === "waffle" ? <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" fill="currentColor" opacity={0.85} /> : null}
    </svg>
  );
}

function MorphChartInner<T>(props: MorphChartProps<T>, ref: React.ForwardedRef<HTMLElement>) {
  const {
    data,
    label,
    value,
    color,
    type: typeProp,
    defaultType = "bar",
    onTypeChange,
    types = MORPH_TYPES,
    switcher = true,
    seriesColor = categoricalColor(0),
    resolution = 48,
    height = 300,
    initialWidth = 640,
    legend = true,
    format,
    locale = "en-US",
    title,
    titleAs: TitleTag = "h3",
    description,
    ariaLabel,
    onActiveChange,
    animation = "auto",
    className,
    ...rest
  } = props;
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const size = useChartSize(boxRef, { initialWidth, height });
  const inView = useInView(boxRef, { once: true, amount: 0.3 });
  const anim = useChartAnimation(animation);
  const [type, setType] = useControllableState<MorphType>({ value: typeProp, defaultValue: defaultType, onChange: onTypeChange, name: "type" });
  const [hover, setHover] = React.useState<number | null>(null);
  const [focus, setFocus] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const W = size.width;
  const H = height;
  const N = Math.max(12, Math.min(160, Math.round(resolution)));

  const fmt = React.useCallback((v: number) => formatNumber(v, format ?? {}, locale), [format, locale]);
  const tickFmt = React.useCallback((v: number) => formatNumber(v, typeof format === "function" ? format : { notation: "compact", maximumFractionDigits: 1, ...format }, locale), [format, locale]);
  const pctFmt = React.useCallback((v: number) => getNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(v), [locale]);

  const rows = React.useMemo(() => {
    const list = data.map((d, i) => {
      const v = Number(readAccessor(value, d, i));
      return {
        datum: d,
        label: String(readAccessor(label, d, i)),
        value: Number.isFinite(v) ? Math.max(0, v) : 0,
        color: (color ? readAccessor(color, d, i) : undefined) ?? categoricalColor(i),
      };
    });
    const total = list.reduce((a, r) => a + r.value, 0);
    const ranks = list.map((_, i) => i).sort((a, b) => (list[b] as { value: number }).value - (list[a] as { value: number }).value);
    return list.map((r, i) => ({ ...r, share: total > 0 ? r.value / total : 0, rank: ranks.indexOf(i) + 1 }));
  }, [data, label, value, color]);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const values = React.useMemo(() => rows.map((r) => r.value), [rows]);
  const layout = React.useMemo(() => layoutMarks(type, values, W, H, N, tickFmt), [type, values, W, H, N, tickFmt]);
  const cartesian = type === "bar" || type === "line" || type === "area";

  // --- The morph engine: one MotionValue holding every mark's `d`, so React renders once per change.
  const engine = React.useRef<{ current: Polygon[]; target: Polygon[] } | null>(null);
  const [shapes] = React.useState(() => {
    const start = anim.entrance ? layout.polys.map((p) => collapsed(p, type, layout.plot.bottom)) : layout.polys;
    engine.current = { current: start, target: start };
    return start;
  });
  const shapesMv = useMotionValue<string[]>(shapes.map((p) => polygonPath(p, 2)));
  const ready = !anim.entrance || inView;

  useIsomorphicLayoutEffect(() => {
    const e = engine.current;
    if (!e || !ready) return;
    const targets = layout.polys;
    // From wherever the marks are now (interruptions never jump); new marks grow out of their target.
    const from = targets.map((t, i) => e.current[i] ?? collapsed(t, type, layout.plot.bottom));
    const to = targets.map((t, i) => alignPolygon(from[i] as Polygon, t));
    e.target = to;
    if (!anim.updates) {
      e.current = to;
      shapesMv.set(to.map((p) => polygonPath(p, 2)));
      return;
    }
    const count = to.length;
    const totalSeconds = MORPH_SECONDS + STAGGER * Math.max(0, count - 1);
    const frame = (t: number) => {
      const elapsed = t * totalSeconds;
      const next = to.map((b, i) => lerpPolygon(from[i] as Polygon, b, ease(Math.max(0, Math.min(1, (elapsed - i * STAGGER) / MORPH_SECONDS)))));
      e.current = next;
      shapesMv.set(next.map((p) => polygonPath(p, 2)));
    };
    const controls = animate(0, 1, { duration: totalSeconds, ease: "linear", onUpdate: frame, onComplete: () => frame(1) });
    return () => controls.stop();
  }, [layout, ready, anim.updates, shapesMv, type]);

  const active = focus ?? hover;
  const info = (i: number): MorphChartItem<T> => {
    const r = rows[i] as (typeof rows)[number];
    return { index: i, label: r.label, value: r.value, share: r.share, rank: r.rank, color: r.color, datum: r.datum };
  };
  const onActiveRef = useLatestRef(onActiveChange);
  const lastActive = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (lastActive.current === active) return;
    lastActive.current = active;
    onActiveRef.current?.(active !== null && active < rows.length ? info(active) : null);
  });

  const describe = (i: number) => {
    const r = rows[i];
    if (!r) return "";
    return `${r.label}: ${fmt(r.value)}, ${pctFmt(r.share)} of total, rank ${r.rank}. ${i + 1} of ${rows.length}.`;
  };
  const switchTo = (next: MorphType) => {
    if (next === type) return;
    setType(next);
    setAnnouncement(`Now showing as ${TYPE_NAMES[next]}.`);
  };
  const cycle = (dir: 1 | -1) => {
    const list = types.length ? types : MORPH_TYPES;
    const at = Math.max(0, list.indexOf(type));
    switchTo(list[(at + dir + list.length) % list.length] as MorphType);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const n = rows.length;
    if (event.key === "]" || event.key === "[") {
      event.preventDefault();
      cycle(event.key === "]" ? 1 : -1);
      return;
    }
    if (!n) return;
    let next: number | null = null;
    const cur = focus ?? -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = cur < 0 ? 0 : (cur + 1) % n;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = cur < 0 ? n - 1 : (cur - 1 + n) % n;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "Escape" && focus !== null) {
      event.preventDefault();
      event.stopPropagation();
      setFocus(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    setAnnouncement(describe(next));
  };

  // Summary for assistive tech.
  const nameText = ariaLabel ?? (typeof title === "string" ? title : "Chart");
  const largest = rows.reduce<(typeof rows)[number] | null>((m, r) => (!m || r.value > m.value ? r : m), null);
  const smallest = rows.reduce<(typeof rows)[number] | null>((m, r) => (!m || r.value < m.value ? r : m), null);
  const summaryText = rows.length
    ? `${TYPE_NAMES[type]} of ${rows.length} items, total ${fmt(total)}. Largest: ${largest?.label} (${fmt(largest?.value ?? 0)}, ${pctFmt(largest?.share ?? 0)}). Smallest: ${smallest?.label} (${fmt(smallest?.value ?? 0)}).`
    : "No data.";

  // Line / area outline that draws in once the marks have settled.
  const outline = cartesian && type !== "bar" ? linePath(layout.plot.points, { curve: "linear" }) : "";
  const settleDelay = anim.updates ? MORPH_SECONDS * 0.7 + STAGGER * rows.length : 0;
  const labelEvery = Math.max(1, Math.ceil(Math.max(...rows.map((r) => estimateTextWidth(r.label, 11)), 1) / Math.max(1, ((layout.plot.right - layout.plot.left) / Math.max(1, rows.length)) - 6)));
  const activeInfo = active !== null && active < rows.length ? info(active) : null;
  const anchor = active !== null ? layout.anchors[active] : undefined;
  const typeList = types.length ? types : MORPH_TYPES;

  return (
    <figure
      ref={ref}
      role="group"
      aria-roledescription="chart"
      aria-labelledby={title ? `${uid}-title` : undefined}
      aria-label={title ? undefined : nameText}
      aria-describedby={`${uid}-desc`}
      data-type={type}
      {...rest}
      className={cn(blockReset, "flex min-w-0 flex-col gap-3 text-pui-foreground", className)}
    >
      {title || description || switcher ? (
        <div className={cn(blockReset, "flex flex-wrap items-start justify-between gap-3")}>
          {title || description ? (
            <figcaption className={cn(blockReset, "flex min-w-0 flex-col gap-0.5")}>
              {title ? (
                <TitleTag id={`${uid}-title`} className={cn(blockReset, "text-sm font-semibold tracking-tight")}>
                  {title}
                </TitleTag>
              ) : null}
              {description ? <span className={cn(blockReset, "text-xs text-pui-muted-foreground")}>{description}</span> : null}
            </figcaption>
          ) : (
            <span />
          )}
          {switcher ? (
            <div
              role="radiogroup"
              aria-label="Chart type"
              className={cn(blockReset, "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-pui-lg border border-pui-border bg-pui-muted/50 p-0.5")}
              onKeyDown={(event) => {
                const dir = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                if (!dir) return;
                event.preventDefault();
                const at = Math.max(0, typeList.indexOf(type));
                const next = typeList[(at + dir + typeList.length) % typeList.length] as MorphType;
                switchTo(next);
                const el = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-morph-type="${next}"]`);
                el?.focus();
              }}
            >
              {typeList.map((t) => {
                const on = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    data-morph-type={t}
                    onClick={() => switchTo(t)}
                    className={cn(
                      controlReset,
                      focusRing,
                      "relative inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-pui-md px-2.5 text-xs font-medium transition-colors duration-150",
                      on ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground",
                    )}
                  >
                    {on ? (
                      <motion.span
                        layoutId={`${uid}-pill`}
                        aria-hidden="true"
                        className={cn(blockReset, "absolute inset-0 rounded-pui-md bg-pui-background shadow-pui-sm")}
                        transition={anim.reducedMotion ? instant : chartMotion.layout}
                      />
                    ) : null}
                    <span className={cn(blockReset, "relative inline-flex items-center gap-1.5")}>
                      <TypeIcon type={t} />
                      {TYPE_LABELS[t]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        ref={boxRef}
        tabIndex={0}
        role="application"
        aria-roledescription="interactive chart"
        aria-label={`${nameText}, shown as ${TYPE_NAMES[type]}. Arrow keys move between items; [ and ] change the chart type.`}
        onKeyDown={onKeyDown}
        onBlur={() => setFocus(null)}
        className={cn(blockReset, focusRing, "relative w-full select-none rounded-pui-md")}
        style={{ height: H, touchAction: "pan-y" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMin meet" aria-hidden="true" className={cn(blockReset, "block overflow-visible")}>
          <AnimatePresence initial={false}>
            {cartesian ? (
              <motion.g key="axes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={anim.reducedMotion ? instant : { duration: 0.25 }}>
                {layout.plot.yTicks.map((t) => (
                  <g key={t.v}>
                    <line x1={layout.plot.left} x2={layout.plot.right} y1={t.y} y2={t.y} stroke="var(--pui-chart-grid)" strokeDasharray={t.v === 0 ? undefined : "3 3"} />
                    <text x={layout.plot.left - 8} y={t.y} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--pui-muted-foreground)" className="tabular-nums">
                      {tickFmt(t.v)}
                    </text>
                  </g>
                ))}
                {rows.map((r, i) =>
                  i % labelEvery === 0 ? (
                    <text key={i} x={layout.plot.centers[i]} y={layout.plot.bottom + 17} textAnchor="middle" fontSize={11} fill={active === i ? "var(--pui-foreground)" : "var(--pui-muted-foreground)"} fontWeight={active === i ? 600 : 400}>
                      {r.label}
                    </text>
                  ) : null,
                )}
              </motion.g>
            ) : null}
          </AnimatePresence>
          <motion.g
            key={anim.reducedMotion ? type : "marks"}
            initial={anim.reducedMotion ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            onPointerLeave={() => setHover(null)}
          >
            {rows.map((r, i) => {
              const fill = type === "line" || type === "area" ? seriesColor : r.color;
              const dim = active !== null && active !== i;
              const isActive = active === i;
              const fillOpacity = type === "area" ? (isActive ? 0.55 : 0.26) : 1;
              return (
                <MorphMark
                  key={i}
                  shapes={shapesMv}
                  index={i}
                  color={fill}
                  opacity={dim ? (type === "area" ? 0.7 : 0.35) : 1}
                  fillOpacity={fillOpacity}
                  onEnter={() => setHover(i)}
                  onLeave={() => setHover((h) => (h === i ? null : h))}
                  onClick={() => {
                    setFocus(null);
                    setHover(i);
                  }}
                />
              );
            })}
          </motion.g>
          <AnimatePresence>
            {outline ? (
              <motion.path
                key={`outline-${type}`}
                d={outline}
                fill="none"
                stroke={seriesColor}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pointerEvents="none"
                initial={anim.updates ? { d: outline, pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1, d: outline }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={anim.updates ? { pathLength: { duration: 0.6, delay: settleDelay, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.2, delay: settleDelay }, d: chartMotion.update } : instant}
              />
            ) : null}
          </AnimatePresence>
          {layout.grid ? (
            <motion.g key="waffle-gaps" initial={anim.updates ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: settleDelay * 0.6 }} pointerEvents="none">
              {Array.from({ length: layout.grid.cols + 1 }, (_, c) => {
                const g = layout.grid as NonNullable<Layout["grid"]>;
                const x = g.x + c * g.cell;
                return <line key={`c${c}`} x1={x} x2={x} y1={g.y - 1} y2={g.y + g.rows * g.cell + 1} stroke="var(--pui-background)" strokeWidth={Math.max(2, g.cell * 0.14)} />;
              })}
              {Array.from({ length: layout.grid.rows + 1 }, (_, r) => {
                const g = layout.grid as NonNullable<Layout["grid"]>;
                const y = g.y + r * g.cell;
                return <line key={`r${r}`} x1={g.x - 1} x2={g.x + g.cols * g.cell + 1} y1={y} y2={y} stroke="var(--pui-background)" strokeWidth={Math.max(2, g.cell * 0.14)} />;
              })}
            </motion.g>
          ) : null}
          {type === "treemap"
            ? layout.rects.map((rect, i) => {
                const r = rows[i];
                if (!r || rect.w < estimateTextWidth(r.label, 11) + 14 || rect.h < 36) return null;
                return (
                  <motion.g key={`tl-${i}`} initial={anim.updates ? { opacity: 0 } : false} animate={{ opacity: active !== null && active !== i ? 0.5 : 1 }} transition={{ duration: 0.25, delay: anim.updates ? settleDelay : 0 }} pointerEvents="none">
                    <text x={rect.x + 8} y={rect.y + 17} fontSize={11} fontWeight={600} fill="var(--pui-background)">
                      {r.label}
                    </text>
                    <text x={rect.x + 8} y={rect.y + 31} fontSize={11} fill="var(--pui-background)" opacity={0.85} className="tabular-nums">
                      {tickFmt(r.value)}
                    </text>
                  </motion.g>
                );
              })
            : null}
          {type === "line" && active !== null && anchor ? (
            <line x1={anchor[0]} x2={anchor[0]} y1={layout.plot.top} y2={layout.plot.bottom} stroke="var(--pui-chart-crosshair)" strokeDasharray="4 4" pointerEvents="none" />
          ) : null}
        </svg>
        {type === "donut" && layout.radial ? (
          <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 flex items-center justify-center")}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeInfo ? `a${activeInfo.index}` : "total"}
                initial={anim.reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
                transition={anim.reducedMotion ? instant : { type: "spring", stiffness: 420, damping: 32 }}
                className={cn(blockReset, "flex flex-col items-center text-center")}
                style={{ marginTop: -4 }}
              >
                <span className={cn(blockReset, "text-[11px] font-medium text-pui-muted-foreground")}>{activeInfo ? activeInfo.label : "Total"}</span>
                <span className={cn(blockReset, "text-xl font-semibold tabular-nums tracking-tight")}>{fmt(activeInfo ? activeInfo.value : total)}</span>
                {activeInfo ? (
                  <span className={cn(blockReset, "text-[11px] font-semibold tabular-nums")} style={{ color: activeInfo.color }}>
                    {pctFmt(activeInfo.share)}
                  </span>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
        <AnimatePresence>
          {activeInfo && anchor && type !== "donut" ? (
            <motion.div
              key="tip"
              role="presentation"
              aria-hidden="true"
              initial={anim.reducedMotion ? false : { opacity: 0, scale: 0.94, left: `${(anchor[0] / W) * 100}%`, top: `${(anchor[1] / H) * 100}%` }}
              animate={{ opacity: 1, scale: 1, left: `${(anchor[0] / W) * 100}%`, top: `${(anchor[1] / H) * 100}%` }}
              exit={anim.reducedMotion ? { opacity: 0, transition: instant } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={anim.reducedMotion ? instant : glide}
              className={cn(blockReset, "pointer-events-none absolute z-10 w-max")}
            >
              <div
                className={cn(blockReset, "rounded-pui-lg border border-pui-chart-tooltip-border bg-pui-chart-tooltip-bg px-3 py-2 text-pui-chart-tooltip-fg shadow-pui-lg backdrop-blur-md")}
                style={{ transform: `translate(${anchor[0] > W * 0.62 ? "calc(-100% - 12px)" : "12px"}, ${anchor[1] < H * 0.3 ? "8px" : "calc(-100% - 8px)"})` }}
              >
                <div className={cn(blockReset, "flex items-center gap-2")}>
                  <span aria-hidden="true" className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: activeInfo.color }} />
                  <span className={cn(blockReset, "text-xs font-semibold")}>{activeInfo.label}</span>
                  <span className={cn(blockReset, "ms-auto ps-3 text-[11px] tabular-nums text-pui-muted-foreground")}>
                    #{activeInfo.rank} of {rows.length}
                  </span>
                </div>
                <div className={cn(blockReset, "mt-1 flex items-baseline gap-2")}>
                  <span className={cn(blockReset, "text-sm font-semibold tabular-nums")}>{fmt(activeInfo.value)}</span>
                  <span className={cn(blockReset, "text-xs tabular-nums text-pui-muted-foreground")}>{pctFmt(activeInfo.share)} of total</span>
                </div>
                <div className={cn(blockReset, "mt-1.5 h-1 w-32 overflow-hidden rounded-pui-full bg-pui-muted")}>
                  <motion.div
                    className={cn(blockReset, "h-full rounded-pui-full")}
                    style={{ background: activeInfo.color }}
                    initial={false}
                    animate={{ width: `${activeInfo.share * 100}%` }}
                    transition={anim.reducedMotion ? instant : chartMotion.update}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {legend ? (
        <div aria-hidden="true" className={cn(blockReset, "flex flex-wrap justify-center gap-x-3 gap-y-1")}>
          {rows.map((r, i) => (
            <span
              key={i}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={cn(blockReset, "inline-flex items-center gap-1.5 text-xs transition-opacity duration-150", active !== null && active !== i ? "opacity-50" : "")}
            >
              <span className={cn(blockReset, "size-2.5 rounded-[3px]")} style={{ background: type === "line" || type === "area" ? seriesColor : r.color, transition: "background-color 380ms" }} />
              <span className={cn(blockReset, "text-pui-foreground")}>{r.label}</span>
              <span className={cn(blockReset, "tabular-nums text-pui-muted-foreground")}>{pctFmt(r.share)}</span>
            </span>
          ))}
        </div>
      ) : null}
      <p id={`${uid}-desc`} className={srOnly}>
        {summaryText}
      </p>
      <ChartLiveRegion text={announcement} />
      <table className={srOnly}>
        <caption>{nameText}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Value</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r.label}</th>
              <td>{fmt(r.value)}</td>
              <td>{pctFmt(r.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * One dataset, seven forms: bar, line, area, pie, donut, treemap and waffle. Marks are resampled
 * polygons that morph point by point between forms, with tooltips, keyboard exploration and a
 * built-in switcher.
 */
export const MorphChart = React.forwardRef(MorphChartInner) as (<T>(props: MorphChartProps<T> & { ref?: React.Ref<HTMLElement> }) => React.ReactElement) & {
  displayName?: string;
};
MorphChart.displayName = "MorphChart";
